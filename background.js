
let currentState = 'idle'; // <-- Add this at the top of your script
updateState('idle');
chrome.storage.sync.remove('startTime');
function updateState(state) {
  currentState = state;
  console.log('State updated to', state);
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
        // put aws lambda link here
      "",
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

  } catch (error) {
    console.error(
      'There was a problem with the fetch operation:',
      error.message
    );
    updateState('error');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'queryState') {
    sendResponse({ taskState: currentState });
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
