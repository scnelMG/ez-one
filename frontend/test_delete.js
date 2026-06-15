import axios from 'axios';

async function testDelete() {
  try {
    // We don't have an access token, so this might fail unless auth is disabled.
    // Let's try calling it anyway.
    const res = await axios.get('http://localhost:8080/api/basket/jobs', {
      headers: { Authorization: 'Bearer test' } // we might need valid token
    });
    console.log("Jobs:", res.data);
  } catch(e) {
    console.error("Error:", e.response?.status, e.response?.data);
  }
}
testDelete();
