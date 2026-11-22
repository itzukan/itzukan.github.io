const exerciseTab = document.getElementById("trial-exercise-tab");
const guideTab = document.getElementById("trial-guide-tab");
const exercise = document.getElementById("trial-exercise");
const guide = document.getElementById("trial-guide");
const editor = document.getElementById("sql");

function selectTab(tab) {
  const showingGuide = tab === guideTab;
  exercise.hidden = showingGuide;
  guide.hidden = !showingGuide;
  for (const item of [exerciseTab, guideTab]) {
    item.setAttribute("aria-selected", String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
  }
}

function returnToEditor() {
  selectTab(exerciseTab);
  editor.focus();
}

for (const tab of [exerciseTab, guideTab]) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    const next = {
      ArrowLeft: tab === guideTab ? exerciseTab : guideTab,
      ArrowRight: tab === exerciseTab ? guideTab : exerciseTab,
      Home: exerciseTab,
      End: guideTab,
    }[event.key];
    if (!next) return;
    event.preventDefault();
    selectTab(next);
    next.focus();
  });
}

document.getElementById("trial-read-guide").addEventListener("click", () => {
  selectTab(guideTab);
  guideTab.focus();
});

for (const id of ["trial-return-to-sql", "loadAnswer", "challengeLoad"]) {
  document.getElementById(id).addEventListener("click", returnToEditor);
}
