const exercises = [];

let currentExerciseIndex = 0;
let trainingMode = false;
let currentStep = 0;
const trainingButton = document.getElementById("training-mode"); // <-- new button

// Utility: deep equality for arrays/objects/primitives
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function highlightLabel(text) {
  return text.replace(/`([^`]+)`/g, '<span class="label">$1</span>');
}

const editorContainer = document.querySelector("#editor");

const outputDiv = document.getElementById("output");

function updateActions(elem) {
  const hideLabelButton = document.querySelector(".result-status-label>button");

  hideLabelButton.addEventListener("click", () => {
    outputDiv.style.display = outputDiv.style.display = "none";
    elem.remove();
  })
}

// Render current exercise
function renderExercise(currentExIndex) {
  const exerciseText = document.querySelector(".exercise-text");
  const currentExercise = exercises[currentExIndex];
  const editorLangContainer = document.querySelector(".editor-lang");
  trainingButton.checked = trainingMode;

  editorLangContainer.innerHTML = `<span class="fw-bold">${currentExercise.codeLang}</span>`;
  exerciseText.innerHTML = `
    <h2>${currentExercise.title}</h2>
    <p>${highlightLabel(currentExercise.problem_statement)}</p>
    <p><strong>Test Cases:</strong></p>
    <ul>
      ${currentExercise.test_cases
      .map(
        (tc) =>
          `<li><code>Input:</code> ${JSON.stringify(tc.input)} → <code>Expected:</code> ${JSON.stringify(tc.expected)}</li>`
      )
      .join("")}
    </ul>
  `;

  // Reset editor content to starter code
  if (window.monacoEditor) {
    window.monacoEditor.setValue(currentExercise.starter_code || "");
  }

  document.getElementById("output").innerHTML = "";
}

// Execute user code for current exercise
function runExercise() {
  if (!window.monacoEditor) {
    document.getElementById("output").innerHTML = `<p style="color:orange">Editor not loaded yet.</p>`;
    return;
  }

  const code = window.monacoEditor.getValue();
  const currentExercise = exercises[currentExerciseIndex];
  const resultStatusLabel = document.createElement("div");
  resultStatusLabel.classList.add("result-status-container");
  let resultsHTML = "<h3>Results:</h3><ul>";

  try {
    const runner = new Function(
      "input",
      code + "; return typeof " + currentExercise.fnName + "==='function' ? " + currentExercise.fnName + "(input) : undefined;"
    );

    outputDiv.style.display = "block";

    currentExercise.test_cases.forEach((test, idx) => {
      try {
        const userOutput = runner(test.input);

        if (deepEqual(userOutput, test.expected)) {
          resultStatusLabel.innerHTML = `<p class="result-status-label" style="color:green; background-color: #d4edda">✅ Test Passed <button class="close btn btn-sm p-1 bg-transparent"><i class="fa fa-close"></i></button></p>`;
          editorContainer.appendChild(resultStatusLabel);
          resultsHTML += `<li style="color:green">✅ Test ${idx + 1} Passed — Output: ${JSON.stringify(userOutput)}</li>`;
        } else {
          resultStatusLabel.innerHTML = `<p class="result-status-label" style="color:red; background-color: #f8d7da">❌ Test Failed <button class="close btn btn-sm p-1 bg-transparent"><i class="fa fa-close"></i></button></p>`;
          editorContainer.appendChild(resultStatusLabel);
          resultsHTML += `<li style="color:red">❌ Test ${idx + 1} Failed — <br>
            <strong>Your Output:</strong> ${JSON.stringify(userOutput)} <br>
            <strong>Expected:</strong> ${JSON.stringify(test.expected)}</li>`;
        }
        updateActions(resultStatusLabel);
      } catch (err) {
        resultsHTML += `<li style="color:red">❌ Test ${idx + 1} Error — ${err.message}</li>`;
      }
    });
  } catch (err) {
    resultsHTML = `<p style="color:red">❌ Code Error: ${err.message}</p>`;
  }

  resultsHTML += "</ul>";
  outputDiv.innerHTML = resultsHTML;
}
document.addEventListener("DOMContentLoaded", () => {

  if (typeof renderExercise === "function") {
    renderExercise(0);
  }

  // Run button
  document.getElementById("run-button").addEventListener("click", runExercise);

  // Next button
  document.getElementById("next-button").addEventListener("click", () => {
    if (currentExerciseIndex < exercises.length - 1) {
      currentExerciseIndex++;
      renderExercise(currentExerciseIndex);
    }
  });

  // Previous button
  document.getElementById("prev-button").addEventListener("click", () => {
    if (currentExerciseIndex > 0) {
      currentExerciseIndex--;
      renderExercise(currentExerciseIndex);
    }
  });

  // Copy button
  document.querySelector(".dropdown-item:nth-child(1)").addEventListener("click", () => {
    if (window.monacoEditor) {
      const code = window.monacoEditor.getValue();
      navigator.clipboard.writeText(code).then(() => {
        alert("Code copied to clipboard!");
      });
    }
  });

  // Reset button
  document.querySelector(".dropdown-item:nth-child(2)").addEventListener("click", () => {
    const currentExercise = exercises[currentExerciseIndex];
    if (window.monacoEditor) {
      window.monacoEditor.setValue(currentExercise.starter_code || "");
    }
  });

  // Format button
  document.querySelector(".dropdown-item:nth-child(3)").addEventListener("click", () => {
    if (window.monacoEditor) {
      window.monacoEditor.getAction("editor.action.formatDocument").run();
    }
  });

});