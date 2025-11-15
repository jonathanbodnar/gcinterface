#!/usr/bin/env node

const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = './reference/instructions.pdf';

fs.readFile(pdfPath, async (err, dataBuffer) => {
  if (err) {
    console.error('Error reading PDF:', err);
    return;
  }

  try {
    const data = await pdf(dataBuffer);
    console.log('📄 INSTRUCTIONS PDF CONTENT:\n');
    console.log('='.repeat(80));
    console.log(data.text);
    console.log('='.repeat(80));
    console.log(`\nPages: ${data.numpages}`);
  } catch (error) {
    console.error('Error parsing PDF:', error);
  }
});
