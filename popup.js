// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function setButtonState(state) {
  const button = document.getElementById('groupTabs');
  if (state === 'started') {
    button.disabled = true;
  } else {
    button.disabled = false;
  }
  console.log(`Button state set to: ${button.disabled ? 'DISABLED' : 'ENABLED'}`);
}

window.addEventListener('unload', function () {
  clearInterval(timerInterval);
});

function updateState(state) {
  chrome.storage.sync.set({ taskState: state }, function () {
    console.log('State updated to', state);
  });
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'receivedData') {
    const data = message.data;
    for (let category of data.categories_tabs) {
      // Collect the tab IDs from the tabs array in the current category
      const tabIds = category.tabs.map((tab) => tab.id);
      //allGroupedTabIds = allGroupedTabIds.concat(tabIds); // Store the tab IDs
      console.log('tab ids', tabIds);
      // Create a new tab group with the collected tab IDs
      const group = await chrome.tabs.group({ tabIds });
      // Update the title of the tab group to the category_name of the current category
      await chrome.tabGroups.update(group, { title: category.category_name });
      await chrome.tabGroups.update(group, { collapsed: true }); // Collapse the group
    }
    //await moveTabsToNewWindow(allGroupedTabIds);
    updateState('completed');
    // Process the received data as required.
    // For example, you could update the DOM with this data.
    const button = document.getElementById('groupTabs');
    if (button) {
      button.disabled = false;
    }
    stopTimer();  // Ensure to stop the timer here.

  }
});

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get(['taskState'], function (data) {
    const button = document.getElementById('groupTabs');
    if (data.taskState === 'started') {
      button.disabled = true;
    } else if (
      data.taskState === 'completed' ||
      data.taskState === 'idle' ||
      data.taskState === 'error'
    ) {
      button.disabled = false;
    }
  });
});

chrome.runtime.sendMessage({ action: 'queryState' }, (response) => {
  if (response.state === 'started') {
    button.disabled = true;
  } else {
    button.disabled = false;
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const button = document.getElementById('groupTabs');

  // chrome.runtime.sendMessage({ action: 'queryState' }, (response) => {
  //   if (response.state === 'started') {
  //     button.disabled = true;
  //   } else {
  //     button.disabled = false;
  //   }
  // });
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

    } else if (state === 'completed' || state === 'error') {
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
//const allTabs = await chrome.tabs.query({});
// get string of urls separated by commas
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
