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
            // Only allow training mode for exercises that have training steps
            const current = this.exercises[this.currentExerciseIndex];
            if (!current || !current.trainingSteps) {
                alert("Training mode is only available for exercises with training steps.");
                this.trainingButton.checked = false;
                return;
            }
            
            this.trainingMode = !this.trainingMode;
            if (this.trainingMode) {
                this.currentStep = 0;
                window.monacoEditor.setValue(""); // Clear editor
                this.runTrainingStep();
            }
        });

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

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    highlightLabel(text) {
        // First escape HTML to prevent XSS and render HTML tags as text
        const escaped = this.escapeHtml(text);
        // Then add highlighting for code labels
        return escaped.replace(/`([^`]+)`/g, '<span class="label">$1</span>');
    }

    updateActions(elem) {
        // Use setTimeout to ensure the element is in the DOM
        setTimeout(() => {
            const hideLabelButton = elem.querySelector("button");
            if (hideLabelButton) {
                hideLabelButton.addEventListener("click", () => {
                    this.outputDiv.style.display = "none";
                    elem.remove();
                });
            }
        }, 0);
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

        // Check if it's HTML/CSS language - use runExample instead of runExercise
        if (this.type === "example" || !current || current.codeLang.toLowerCase() === "html" || current.codeLang.toLowerCase() === "css") {
            this.runExample(current, code);
        } else {
            this.runExercise(current, code);
        }
    }

    runExample(current, code) {
        try {
            // Use the language from current exercise or this.codeLang
            const lang = current ? current.codeLang.toLowerCase() : this.codeLang.toLowerCase();
            if (lang === "html" || lang === "css") {
                this.outputDiv.innerHTML = `<iframe style="width:100%;height:200px;border:1px solid #ccc"></iframe>`;
                const iframe = this.outputDiv.querySelector("iframe");
                this.outputDiv.style.display = "block";
                const htmlContent =
                    lang === "html" ? code : `<style>${code}</style>`;
                iframe.srcdoc = htmlContent;
            } else if (lang === "javascript") {
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
        if (!current || !current.trainingSteps || this.currentStep >= current.trainingSteps.length) {
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
            if (this.type === "example" || !current) {
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

    // Load exercises from JSON file
    async loadExercises(lang) {
        try {
            const response = await fetch(`./data/demo/${lang}/exercise_1.json`);
            if (!response.ok) throw new Error(`Could not load ${lang} exercises`);
            const data = await response.json();
            this.exercises = data;
            this.currentExerciseIndex = 0;
            this.currentStep = 0;
            this.trainingMode = false;
            this.trainingButton.checked = false;
            this.type = "exercise";
            // Update codeLang based on first exercise or passed language
            if (data && data.length > 0) {
                this.codeLang = data[0].codeLang || lang;
            } else {
                // Map language to proper display name
                const langMap = {
                    "javascript": "Javascript",
                    "html": "HTML",
                    "html&css": "CSS"
                };
                this.codeLang = langMap[lang] || lang;
            }
            this.renderExercise(0);
        } catch (err) {
            console.error("Error loading exercises:", err);
            this.exercises = [];
            this.type = "example";
        }
    }

    // Switch language and load corresponding exercises
    switchLanguage(lang) {
        const langMap = {
            "javascript": "javascript",
            "html": "html",
            "css": "html&css"
        };
        
        const mappedLang = langMap[lang] || lang;
        this.loadExercises(mappedLang);
    }
}

// Initialize editor and language selector
document.addEventListener("DOMContentLoaded", () => {
    const languageButtons = document.querySelectorAll(".language-btn");
    
    let editor1;
    setTimeout(() => {
        editor1 = new Editor({
            containerId: "editor",
            codeLang: "Javascript",
            type: "exercise",
            exercises: []
        });
        
        // Load default language exercises
        editor1.loadExercises("javascript");
    }, 1000);
    
    // Language selector button handlers
    languageButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const lang = btn.dataset.lang;
            languageButtons.forEach(b => {
                b.classList.remove("btn-primary", "active");
                b.classList.add("btn-secondary");
            });
            btn.classList.remove("btn-secondary");
            btn.classList.add("btn-primary", "active");
            
            if (editor1) {
                editor1.switchLanguage(lang);
            }
        });
    });
});