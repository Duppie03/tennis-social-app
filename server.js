const express = require('express');
const app = express();
const PORT = 3000;

// This is the CRUCIAL line. It tells Express to make the 'public' folder
// accessible to the browser.
app.use(express.static('public'));

app.use(express.json()); // Middleware to understand JSON requests

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});