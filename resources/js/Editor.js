class Editor {
    constructor({ containerId, codeLang, starter_code, exercises = [], type = "example" }) {
        this.container = document.getElementById(containerId);
        this.exercises = exercises;
        this.type = type; // "example" or "exercise"

        this.currentExerciseIndex = 0;
        this.trainingMode = false;
        this.currentStep = 0;
        this.codeLang = codeLang;
        this.starter_code = starter_code;

        this.outputDiv = document.getElementById("output");
        this.trainingButton = document.getElementById("training-mode");

        this.init();
    }


    init() {
        // Bind training button
        this.trainingButton.addEventListener("click", () => {
            this.trainingMode = !this.trainingMode;
            if (this.trainingMode) {
                this.currentStep = 0;
                window.monacoEditor.setValue(""); // Clear editor
                this.runTrainingStep();
            }
        });

        console.log("cont : ", this.container);

        // Buttons
        document.getElementById("run-button").addEventListener("click", () => this.runCode());
        document.getElementById("next-button").addEventListener("click", () => this.nextExercise());
        document.getElementById("prev-button").addEventListener("click", () => this.prevExercise());

        // Dropdown actions
        document.querySelector(".dropdown-item:nth-child(1)").addEventListener("click", () => this.copyCode());
        document.querySelector(".dropdown-item:nth-child(2)").addEventListener("click", () => this.resetCode());
        document.querySelector(".dropdown-item:nth-child(3)").addEventListener("click", () => this.formatCode());

        // Render only based on type
        if (this.type === "example") {
            this.renderExample();
        }
        if (this.type === "exercise" && this.exercises.length > 0) {
            this.renderExercise(0);
        }
    }

    // Helpers
    deepEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    highlightLabel(text) {
        return text.replace(/`([^`]+)`/g, '<span class="label">$1</span>');
    }

    updateActions(elem) {
        const hideLabelButton = document.querySelector(".result-status-label>button");
        hideLabelButton.addEventListener("click", () => {
            this.outputDiv.style.display = "none";
            elem.remove();
        });
    }

    // Render exercise / example
    renderExercise(index) {
        const exerciseText = document.querySelector(".exercise-text");
        const current = this.exercises[index];
        const editorLangContainer = document.querySelector(".editor-lang");

        this.trainingButton.checked = this.trainingMode;
        editorLangContainer.innerHTML = `<span class="fw-bold">${current.codeLang}</span>`;
        exerciseText.innerHTML = `
      <h2>${current.title}</h2>
      <p>${this.highlightLabel(current.problem_statement)}</p>
      <p><strong>Test Cases:</strong></p>
      <ul>
        ${current.test_cases
                .map(tc => `<li><code>Input:</code> ${JSON.stringify(tc.input)} → <code>Expected:</code> ${JSON.stringify(tc.expected)}</li>`)
                .join("")}
      </ul>
      ${this.type === "exercise" && current.solution ? `<details><summary>Solution</summary><pre>${current.solution}</pre></details>` : ""}
    `;

        // Reset Monaco editor with starter code
        if (window.monacoEditor) {
            window.monacoEditor.setValue(current.starter_code || "");
            monaco.editor.setModelLanguage(window.monacoEditor.getModel(), current.codeLang.toLowerCase());
        }

        this.outputDiv.innerHTML = "";
        this.outputDiv.style.display = "none";
    }


    renderExample() {
        const editorLangContainer = document.querySelector(".editor-lang");

        this.trainingButton.checked = this.trainingMode;
        console.log(this.codeLang);
        editorLangContainer.innerHTML = `<span class="fw-bold">${this.codeLang}</span>`;

        // Reset Monaco editor with starter code
        if (window.monacoEditor) {
            window.monacoEditor.setValue(this.starter_code || "");
            monaco.editor.setModelLanguage(window.monacoEditor.getModel(), this.codeLang.toLowerCase());
        }

        this.outputDiv.innerHTML = "";
        this.outputDiv.style.display = "none";
    }

    // Run code depending on type
    runCode() {
        const current = this.exercises[this.currentExerciseIndex];
        const code = window.monacoEditor.getValue();

        if (this.type === "example") {
            this.runExample(current, code);
        } else {
            this.runExercise(current, code);
        }
    }

    runExample(current, code) {
        try {
            if (this.codeLang.toLowerCase() === "html" || this.codeLang.toLowerCase() === "css") {
                this.outputDiv.innerHTML = `<iframe style="width:100%;height:200px;border:1px solid #ccc"></iframe>`;
                const iframe = this.outputDiv.querySelector("iframe");
                this.outputDiv.style.display = "block";
                const htmlContent =
                    this.codeLang.toLowerCase() === "html" ? code : `<style>${code}</style>`;
                iframe.srcdoc = htmlContent;
            } else if (this.codeLang.toLowerCase() === "javascript") {
                this.outputDiv.innerHTML = `<pre class="console-output"></pre>`;
                const consoleArea = this.outputDiv.querySelector("pre");
                this.outputDiv.style.display = "block";
                const consoleLog = (...args) => {
                    consoleArea.textContent += args.join(" ") + "\n";
                };
                new Function("console", code)({ log: consoleLog });
            }
        } catch (err) {
            this.outputDiv.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
        }
    }

    runExercise(current, code) {
        let resultsHTML = "<h3>Results:</h3><ul>";
        const resultStatusLabel = document.createElement("div");
        resultStatusLabel.classList.add("result-status-container");
        try {
            const runner = new Function(
                "input",
                code + "; return typeof " + current.fnName + "==='function' ? " + current.fnName + "(input) : undefined;"
            );

            this.outputDiv.style.display = "block";
            current.test_cases.forEach((test, idx) => {
                try {
                    const userOutput = runner(test.input);

                    if (this.deepEqual(userOutput, test.expected)) {
                        resultStatusLabel.innerHTML = `<p class="result-status-label" style="color:green; background-color: #d4edda">✅ Test Passed <button class="close btn btn-sm p-1 bg-transparent"><i class="fa fa-close"></i></button></p>`;
                        resultsHTML += `<li style="color:green">✅ Test ${idx + 1} Passed — Output: ${JSON.stringify(userOutput)}</li>`;
                    } else {
                        resultStatusLabel.innerHTML = `<p class="result-status-label" style="color:red; background-color: #f8d7da">❌ Test Failed <button class="close btn btn-sm p-1 bg-transparent"><i class="fa fa-close"></i></button></p>`;
                        resultsHTML += `<li style="color:red">❌ Test ${idx + 1} Failed — Your Output: ${JSON.stringify(userOutput)}, Expected: ${JSON.stringify(test.expected)}</li>`;
                    }
                } catch (err) {
                    resultsHTML += `<li style="color:red">❌ Test ${idx + 1} Error — ${err.message}</li>`;
                }
            });
        } catch (err) {
            resultsHTML = `<p style="color:red">❌ Code Error: ${err.message}</p>`;
        }

        this.container.appendChild(resultStatusLabel);
        this.updateActions(resultStatusLabel);

        resultsHTML += "</ul>";
        this.outputDiv.innerHTML = resultsHTML;
    }

    // Training steps
    runTrainingStep() {
        const current = this.exercises[this.currentExerciseIndex];
        if (this.currentStep >= current.trainingSteps.length) {
            responsiveVoice.speak("Training complete!", "UK English Male");
            setTimeout(() => {
                this.trainingMode = false;
                this.trainingButton.checked = this.trainingMode;
            }, 2000);
            return;
        }

        const step = current.trainingSteps[this.currentStep];

        if (step.cursor) {
            window.monacoEditor.setPosition(step.cursor);
            window.monacoEditor.focus();
        }

        responsiveVoice.speak(step.message, "UK English Male", {
            onend: () => {
                if (step.expectedText) {
                    this.typeWriterEffect(step.expectedText, step.cursor, () => {
                        this.currentStep++;
                        if (this.trainingMode) setTimeout(() => this.runTrainingStep(), 1500);
                    });
                } else {
                    this.currentStep++;
                    if (this.trainingMode) setTimeout(() => this.runTrainingStep(), 1500);
                }
            }
        });
    }

    typeWriterEffect(text, position, callback) {
        let i = 0;
        const typing = () => {
            if (i < text.length) {
                window.monacoEditor.executeEdits(null, [
                    {
                        range: new monaco.Range(
                            position.lineNumber,
                            position.column + i,
                            position.lineNumber,
                            position.column + i
                        ),
                        text: text[i],
                        forceMoveMarkers: true
                    }
                ]);
                i++;
                setTimeout(typing, 120);
            } else if (callback) callback();
        };
        typing();
    }

    setEditorLanguage(lang, starterCode = null) {
        this.codeLang = lang;
        if (starterCode) this.starter_code = starterCode;

        if (window.monacoEditor) {
            monaco.editor.setModelLanguage(window.monacoEditor.getModel(), this.codeLang.toLowerCase());
            if (starterCode) {
                window.monacoEditor.setValue(starterCode);
            }
        }
    }


    // Navigation
    nextExercise() {
        if (this.currentExerciseIndex < this.exercises.length - 1) {
            this.currentExerciseIndex++;
            this.renderExercise(this.currentExerciseIndex);
        }
    }

    prevExercise() {
        if (this.currentExerciseIndex > 0) {
            this.currentExerciseIndex--;
            this.renderExercise(this.currentExerciseIndex);
        }
    }

    // Utility actions
    copyCode() {
        if (window.monacoEditor) {
            const code = window.monacoEditor.getValue();
            navigator.clipboard.writeText(code).then(() => alert("Code copied to clipboard!"));
        }
    }

    resetCode() {
        const current = this.exercises[this.currentExerciseIndex];
        if (window.monacoEditor) {
            if (this.type === "example") {
                window.monacoEditor.setValue(this.starter_code || "");
            } else {
                window.monacoEditor.setValue(current.starter_code || "");
            }
        }
        this.outputDiv.style.display = "none";
    }

    formatCode() {
        if (window.monacoEditor) {
            window.monacoEditor.getAction("editor.action.formatDocument").run();
        }
    }
}
const root = document.getElementById("editor");
// Example Editor for HTML
// new Editor({
//   container: root,
//   codeLang: "html",
//   type: "example",
//   starter_code: "<h1>Hello World</h1>"
// });

// Example Editor for JavaScript
// new Editor({
//   container: root,
//   codeLang: "javascript",
//   type: "example",
//   starter_code: "console.log('Hello from JS!')"
// });






const exercises = [
    {
        title: "Example Exercise 1",
        codeLang: "Javascript",
        problem_statement: "Write a function `sum` that takes an array of numbers and returns the sum of all the numbers.",
        test_cases: [
            { input: [1, 2, 3, 4, 5], expected: 15 }
        ],
        trainingSteps: [
            { message: "Start by typing the keyword function.", cursor: { lineNumber: 1, column: 1 }, expectedText: "function " },
            { message: "Next, write the function name sum.", cursor: { lineNumber: 1, column: 10 }, expectedText: "sum" },
            { message: "Now, add parentheses and a parameter named input.", cursor: { lineNumber: 1, column: 13 }, expectedText: "(input)" },
            { message: "Open a curly brace to start the function body.", cursor: { lineNumber: 1, column: 20 }, expectedText: " {" },
            { message: "Inside the function, type return input.reduce.", cursor: { lineNumber: 2, column: 3 }, expectedText: "\n  return input.reduce" },
            { message: "Inside reduce, write accumulator comma current.", cursor: { lineNumber: 2, column: 25 }, expectedText: "((accumulator, current)" },
            { message: "Add arrow function that returns accumulator plus current.", cursor: { lineNumber: 3, column: 47 }, expectedText: " => accumulator + current" },
            { message: "Finally, close the reduce call with parentheses.", cursor: { lineNumber: 2, column: 72 }, expectedText: ")" },
            { message: "Close the function body.", cursor: { lineNumber: 3, column: 1 }, expectedText: "\n}" }
        ],
        fnName: "sum",
        starter_code: `function sum(input) {\n  // Your code here\n}`
    },
    {
        title: "Example Exercise 2",
        codeLang: "Javascript",
        problem_statement: "Write a function `reverse` that takes a string and returns the reversed string.",
        test_cases: [
            { input: "hello", expected: "olleh" },
            { input: "abc", expected: "cba" }
        ],
        trainingSteps: [
            { message: "Start by typing the keyword function.", cursor: { lineNumber: 1, column: 1 }, expectedText: "function " },
            { message: "Next, write the function name reverse.", cursor: { lineNumber: 1, column: 10 }, expectedText: "reverse" },
            { message: "Add parentheses and a parameter named input.", cursor: { lineNumber: 1, column: 17 }, expectedText: "(input)" },
            { message: "Open a curly brace to start the function body.", cursor: { lineNumber: 1, column: 24 }, expectedText: " {" },
            { message: "Inside the function, write return input.split.", cursor: { lineNumber: 2, column: 3 }, expectedText: "\n  return input.split" },
            { message: "Pass empty string as argument to split.", cursor: { lineNumber: 2, column: 25 }, expectedText: "('')" },
            { message: "Now chain reverse method after split.", cursor: { lineNumber: 2, column: 29 }, expectedText: ".reverse()" },
            { message: "Finally, chain join method with empty string to combine characters.", cursor: { lineNumber: 2, column: 39 }, expectedText: ".join('')" },
            { message: "Close the function body.", cursor: { lineNumber: 3, column: 1 }, expectedText: "\n}" }
        ],
        fnName: "reverse",
        starter_code: `function reverse(input) {\n  // Your code here\n}`
    }
];



// Exercise Editor for JavaScript

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        // when creating a new editor instance
        const editor1 = new Editor({
            containerId: "editor",
            codeLang: "html",
            starter_code: "function sum(input) {\n  // Your code here\n}",
        }
        );
        // later, if you want to switch to JS without re-creating editor
        editor1.setEditorLanguage("html", "<h1>Hello</h1>");
    }, 1000);
})