const crypto = require('crypto');
const fs = require('fs');
const sharp = require('sharp');


function calculateHash(filePath, algorithm = 'sha512') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}


async function modifyToMatchHash(fileBuffer, targetPrefix, algorithm = 'sha512') {
  let modifiedBuffer = Buffer.from(fileBuffer);
  let counter = 0;

  while (true) {
    const randomByte = crypto.randomBytes(1);
    modifiedBuffer[modifiedBuffer.length - 1] = randomByte[0]; // Modify the last byte
    const hash = crypto.createHash(algorithm).update(modifiedBuffer).digest('hex');

    if (hash.startsWith(targetPrefix)) {
      console.log(`Match found after ${counter} attempts!`);
      return modifiedBuffer;
    }

    counter++;
    if (counter % 100000 === 0) {
      console.log(`Attempts: ${counter}`);
    }
  }
}


async  function spoof(hexPrefix, inputFile, outputFile) {
  try {
    // Read the input image
    const fileBuffer = fs.readFileSync(inputFile);

    // Optionally optimize image using sharp
    const optimizedBuffer = await sharp(fileBuffer)
      .png({ compressionLevel: 9 }) // Save as PNG with high compression
      .toBuffer();

    // Modify metadata to achieve the desired hash
    const modifiedBuffer = await modifyToMatchHash(optimizedBuffer, hexPrefix);

    // Write the altered file
    fs.writeFileSync(outputFile, modifiedBuffer);

    // Compute and log the new hash
    const finalHash = await calculateHash(outputFile);
    console.log(`File: ${outputFile}`);
    console.log(`New hash: ${finalHash}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Parse command-line arguments
const [targetHexPrefix, inputFilePath, outputFilePath] = process.argv.slice(2);

if (!targetHexPrefix || !inputFilePath || !outputFilePath) {
  console.log('Usage: node spoof.js <hexPrefix> <inputFile> <outputFile>');
  process.exit(1);
}

// Run the spoof function
spoof(targetHexPrefix.replace('0x', ''), inputFilePath, outputFilePath);
