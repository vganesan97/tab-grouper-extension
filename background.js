// At the top of background.js


let currentState = 'idle'; // <-- Add this at the top of your script
updateState('idle');
chrome.storage.sync.remove('startTime');
function updateState(state) {
  currentState = state;
  console.log('State updated to', state);
}

async function moveTabsToNewWindow(tabIds) {
  // Create a new normal window
  const newWindow = await chrome.windows.create();

  // Move the tab groups to the new window
  await chrome.tabs.move(tabIds, { windowId: newWindow.id, index: -1 });
}

async function makeRequest(numOfCategories, urls) {
  const startTime = new Date().getTime();
  chrome.storage.sync.set(
    { startTime: startTime, taskState: 'started' },
    function () {
      console.log('Operation start time stored:', startTime);
    }
  );

  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    const bodyData = {
      urls: urls,
      numOfCategories: numOfCategories
    };

    const response = await fetch(
      'https://mppu5qaklehpbedy466yqxwu340qhekt.lambda-url.us-east-2.on.aws/',
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(bodyData, null, 2)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('function call response', data);

    chrome.runtime.sendMessage({ action: 'receivedData', data: data });

    // //const a = JSON.parse(data.choices[0].message.function_call.arguments);
    // let allGroupedTabIds = []; // To store all the tab IDs in the groups you created
    //
    // // Iterate through each category in the categories_tabs array
    // for (let category of data.categories_tabs) {
    //   // Collect the tab IDs from the tabs array in the current category
    //   const tabIds = category.tabs.map((tab) => tab.id);
    //   //allGroupedTabIds = allGroupedTabIds.concat(tabIds); // Store the tab IDs
    //
    //   // Create a new tab group with the collected tab IDs
    //   const group = await chrome.tabs.group({ tabIds });
    //   // Update the title of the tab group to the category_name of the current category
    //   await chrome.tabGroups.update(group, { title: category.category_name });
    //   await chrome.tabGroups.update(group, { collapsed: true }); // Collapse the group
    // }
    // //await moveTabsToNewWindow(allGroupedTabIds);
    // updateState('completed'); // <-- Add this line to update the state to completed after operation
  } catch (error) {
    console.error(
      'There was a problem with the fetch operation:',
      error.message
    );
    updateState('error'); // <-- Add this line to update the state to error if there's an issue
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'queryState') {
    sendResponse({ state: currentState });
  }

  if (request.action === 'startMakeRequest') {
    makeRequest(request.numOfCategories, request.urls)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
  }
  return true; // Keeps the message channel open until sendResponse is executed.
});
