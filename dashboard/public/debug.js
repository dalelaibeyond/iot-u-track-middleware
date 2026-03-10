// Add to browser console (F12) to debug

// 1. Check if WebSocket is connected
console.log('WebSocket state:', window.ws ? window.ws.readyState : 'Not stored');

// 2. Intercept WebSocket messages
if (window.ws) {
  const originalOnMessage = window.ws.onmessage;
  window.ws.onmessage = function (event) {
    console.log('← WebSocket message received:', event.data);
    if (originalOnMessage) originalOnMessage.call(this, event);
  };
  console.log('✓ WebSocket message interceptor installed');
}

// 3. Check store state
if (window.useIoTStore) {
  const state = window.useIoTStore.getState();
  console.log('Store state deviceList:', state.deviceList);
  console.log('Store state activeDeviceId:', state.activeDeviceId);
  console.log('Store state deviceList length:', state.deviceList.length);
}

// 4. Check if messages are being processed
console.log('Checking for useIoTStore.mergeUpdate...');
if (window.useIoTStore) {
  const originalMergeUpdate = window.useIoTStore.getState().mergeUpdate;
  window.useIoTStore.getState().mergeUpdate = function (...args) {
    console.log('✓ mergeUpdate called with:', args);
    return originalMergeUpdate.apply(this, args);
  };
  console.log('✓ mergeUpdate interceptor installed');
}

console.log('\nDebug script installed. Select a device and watch console.');
