trainingButton.addEventListener("click", () => {
  trainingMode = !trainingMode;
  if (trainingMode){
  currentStep = 0;
  window.monacoEditor.setValue(""); // Clear editor
  runTrainingStep();
  } 
});


function typeWriterEffect(text, position, callback) {
  let i = 0;

  function typing() {
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
      setTimeout(typing, 120); // typing speed (ms per char)
    } else {
      if (callback) callback();
    }
  }

  typing();
}

function runTrainingStep() {
  const exercise = exercises[currentExerciseIndex];
  if (currentStep >= exercise.trainingSteps.length) {
    responsiveVoice.speak("Training complete!", "UK English Male");
    setTimeout(() => {
      trainingMode = false;
      trainingButton.checked = trainingMode; // Uncheck the checkbox
    }, 2000);
    return;
  }

  const step = exercise.trainingSteps[currentStep];

  // Ensure cursor is ready
  if (step.cursor) {
    window.monacoEditor.setPosition(step.cursor);
    window.monacoEditor.focus();
  }

  // 1) Speak instruction first
  responsiveVoice.speak(step.message, "UK English Male", {
    onend: () => {
      // 2) After voice ends, type expected text
      if (step.expectedText) {
        typeWriterEffect(step.expectedText, step.cursor, () => {
          // 3) After typing, move to next step after 1.5s delay
          currentStep++;
          if (trainingMode) {
            setTimeout(runTrainingStep, 1500);
          }
        });
      } else {
        // If no text to type, go to next step after short delay
        currentStep++;
        if (trainingMode) {
          setTimeout(runTrainingStep, 1500);
        }
      }
    }
  });
}

