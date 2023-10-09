function updateState(state) {
  chrome.storage.sync.set({ taskState: state }, function () {
    console.log('State updated to', state);
  });
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'receivedData') {
    const data = message.data;
    for (let category of data.categories_tabs) {
      const tabIds = category.tabs.map((tab) => tab.id);
      const group = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(group, { title: category.category_name });
      await chrome.tabGroups.update(group, { collapsed: true }); // Collapse the group
    }
    updateState('idle');
    const button = document.getElementById('groupTabs');
    if (button) {
      button.disabled = false;
    }
    stopTimer();  // Ensure to stop the timer here.

  }
});

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get(['taskState', 'startTime'], function (data) {
    const state = data.taskState || 'idle';
    if (state === 'started' && data.startTime) {
      const button = document.getElementById('groupTabs');
      button.disabled = true;

      clearInterval(timerInterval); // Clear any existing timer first

      let startTime = data.startTime;
      let now = new Date().getTime();
      let elapsedSeconds = Math.floor((now - startTime) / 1000);

      // Initialize the timer display with the elapsed time
      document.getElementById('timer').querySelector('span').innerText =
        elapsedSeconds;
      document.getElementById('timer').style.display = 'block';

      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        elapsedSeconds += 1;
        document.getElementById('timer').querySelector('span').innerText =
            elapsedSeconds;
      }, 1000);

    } else if (state === 'idle' || state === 'error') {
      clearInterval(timerInterval);
      document.getElementById('timer').style.display = 'none';
    } else {
      clearInterval(timerInterval);
      document.getElementById('groupTabs').disabled = false;
      document.getElementById('timer').style.display = 'none';
    }
    if (state !== 'started') {
      clearInterval(timerInterval);  // Clear the timer if not in 'started' state.
    }
  });
});

function showLoader() {
  document.getElementById('loader').style.display = 'block';
}

// Hide loader
function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

let timerInterval;

function startTimer() {
  let elapsedSeconds = 0;
  document.getElementById('timer').style.display = 'block';
  document.getElementById('timer').querySelector('span').innerText =
    elapsedSeconds;

  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    document.getElementById('timer').querySelector('span').innerText =
      elapsedSeconds;
  }, 1000); // update every second
}

function stopTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer').style.display = 'none';
}

const allTabs = await chrome.tabs.query({ windowType: 'normal' });
console.log('all tabs', allTabs);

const filteredUrls = allTabs.map((tab) => ({
  title: tab.title,
  id: tab.id
}));
console.log(filteredUrls);

const button = document.getElementById('groupTabs');
button.addEventListener('click', () => {
  button.disabled = true; // Disable the button immediately when clicked
  showLoader();
  startTimer();

  chrome.runtime.sendMessage(
    {
      action: 'startMakeRequest',
      numOfCategories: 8,
      urls: filteredUrls
    },
    (response) => {
      if (response.success) {
        console.log('Request completed successfully.');
      } else {
        console.error('Error:', response.error);
      }
      stopTimer();
      hideLoader();
    }
  );
});
