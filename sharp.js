const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');

function calculateHash(filePath) {
    const hash = crypto.createHash('sha512');
    const fileBuffer = fs.readFileSync(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
}

async function spoofImage(hexString, inputFilePath, outputFilePath) {
    // Validate the hex string
    if (!/^0x[0-9A-Fa-f]{2}$/.test(hexString)) {
        throw new Error('Invalid hex string format. Use format like "0x24".');
    }

    const targetPrefix = hexString.slice(2); // Remove '0x'

    // Load the original image
    const image = sharp(inputFilePath);

    // Get the metadata of the original image
    const metadata = await image.metadata();

    // Create a modified image buffer
    const modifiedImageBuffer = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Make a slight modification to the pixel data
    const data = modifiedImageBuffer.data;
    // Change the last pixel value to influence the hash
    data[data.length - 1] = (data[data.length - 1] + parseInt(targetPrefix, 16)) % 256;

    // Save the modified image
    await sharp(modifiedImageBuffer.data, {
        raw: {
            width: modifiedImageBuffer.info.width,
            height: modifiedImageBuffer.info.height,
            channels: modifiedImageBuffer.info.channels
        }
    }).toFile(outputFilePath);

    // Check the hash of the modified image
    const hash = calculateHash(outputFilePath);
    console.log(`Hash of ${outputFilePath}: ${hash}`);

    // Check if the hash starts with the target prefix
    if (!hash.startsWith(targetPrefix)) {
        throw new Error(`Failed to create a hash starting with ${targetPrefix}`);
    }

    console.log(`Successfully created ${outputFilePath} with hash starting with ${targetPrefix}`);
}

// Command line arguments
const args = process.argv.slice(2);
if (args.length !== 3) {
    console.error('Usage: node spoof.js <hexstring> <original_image> <output_image>');
    process.exit(1);
}

const hexString = args[0];
const inputFilePath = args[1];
const outputFilePath = args[2];

spoofImage(hexString, inputFilePath, outputFilePath)
    .then(() => console.log('Image processing completed.'))
    .catch(err => console.error(err.message));