// Shelly Device Diagnostic Script
// Run this in Node.js to test your Shelly device
// Usage: node shelly_diagnostic.js <device_ip>

const fetch = require('node-fetch');

const deviceIp = process.argv[2] || '192.168.1.100'; // Default IP or pass as argument

console.log(`\n🔍 Testing Shelly Device at: ${deviceIp}\n`);
console.log('='.repeat(60));

async function testShellyDevice() {
    // Test 1: Check device info
    console.log('\n📋 Test 1: Getting device info...');
    try {
        const infoUrl = `http://${deviceIp}/shelly`;
        console.log(`   Trying: ${infoUrl}`);
        const response = await fetch(infoUrl, { timeout: 5000 });
        if (response.ok) {
            const data = await response.json();
            console.log('   ✅ Device Info:', JSON.stringify(data, null, 2));
            
            if (data.gen) {
                console.log(`   📌 Generation: ${data.gen}`);
            } else if (data.type) {
                console.log(`   📌 Type: ${data.type} (likely Gen 1)`);
            }
        } else {
            console.log(`   ⚠️  Status: ${response.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: Try Gen 2 RPC API
    console.log('\n📋 Test 2: Testing Gen 2 (RPC) API...');
    try {
        const gen2Url = `http://${deviceIp}/rpc`;
        const gen2Payload = {
            id: 1,
            method: "Switch.GetStatus",
            params: { id: 0 }
        };
        console.log(`   Trying: ${gen2Url}`);
        console.log(`   Payload: ${JSON.stringify(gen2Payload)}`);
        
        const response = await fetch(gen2Url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gen2Payload),
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('   ✅ Gen 2 API works!');
            console.log('   Response:', JSON.stringify(data, null, 2));
            console.log('\n   💡 Your device is Gen 2 or Plus');
        } else {
            console.log(`   ⚠️  Status: ${response.status} - Not Gen 2`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Try Gen 1 API - Get Status
    console.log('\n📋 Test 3: Testing Gen 1 API (status)...');
    try {
        const gen1Url = `http://${deviceIp}/relay/0`;
        console.log(`   Trying: ${gen1Url}`);
        
        const response = await fetch(gen1Url, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('   ✅ Gen 1 API works!');
            console.log('   Response:', JSON.stringify(data, null, 2));
            console.log('\n   💡 Your device is Gen 1');
            
            if (data.ison !== undefined) {
                console.log(`   📌 Current state: ${data.ison ? 'ON' : 'OFF'}`);
            }
        } else {
            console.log(`   ⚠️  Status: ${response.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Try Gen 1 API - Control (turn on then off)
    console.log('\n📋 Test 4: Testing Gen 1 control (will toggle light)...');
    try {
        // Turn ON
        const onUrl = `http://${deviceIp}/relay/0?turn=on`;
        console.log(`   Trying: ${onUrl}`);
        
        const onResponse = await fetch(onUrl, { timeout: 5000 });
        if (onResponse.ok) {
            const onData = await onResponse.json();
            console.log('   ✅ Turn ON successful');
            console.log('   Response:', JSON.stringify(onData, null, 2));
        }

        // Wait 2 seconds
        console.log('   ⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Turn OFF
        const offUrl = `http://${deviceIp}/relay/0?turn=off`;
        console.log(`   Trying: ${offUrl}`);
        
        const offResponse = await fetch(offUrl, { timeout: 5000 });
        if (offResponse.ok) {
            const offData = await offResponse.json();
            console.log('   ✅ Turn OFF successful');
            console.log('   Response:', JSON.stringify(offData, null, 2));
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Check settings endpoint
    console.log('\n📋 Test 5: Checking device settings...');
    try {
        const settingsUrl = `http://${deviceIp}/settings`;
        console.log(`   Trying: ${settingsUrl}`);
        
        const response = await fetch(settingsUrl, { timeout: 5000 });
        if (response.ok) {
            const data = await response.json();
            console.log('   ✅ Settings retrieved');
            console.log('   Device type:', data.device?.type || 'Unknown');
            console.log('   Firmware:', data.fw || 'Unknown');
            console.log('   WiFi SSID:', data.wifi_sta?.ssid || 'Unknown');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnostic complete!\n');
}

testShellyDevice().catch(err => {
    console.error('\n❌ Diagnostic failed:', err);
    process.exit(1);
});