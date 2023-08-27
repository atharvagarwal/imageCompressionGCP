const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

//Compression Script
const compressAndResizeImage = async (
  inputPath,
  outputPath,
  compressionPercentage
) => {
  try {
    // Read the input image file
    const inputBuffer = await fs.promises.readFile(inputPath);

    // Get the size of the original image in kilobytes (KB)
    const inputSize = (Buffer.byteLength(inputBuffer) / 1024).toFixed(2);
    // Get the dimensions of the input image
    const inputMetadata = await sharp(inputBuffer).metadata();
    const { width: originalWidth, height: originalHeight } = inputMetadata;
    let scaleFactor = 1 - compressionPercentage / 100;
    const maxWidth = Math.floor(originalWidth * scaleFactor);
    const maxHeight = Math.floor(originalHeight * scaleFactor);

    if (originalWidth >= originalHeight) {
      scaleFactor = (maxWidth / originalWidth).toPrecision(4);
    } else {
      scaleFactor = (maxHeight / originalHeight).toPrecision(4);
    }
    const width = Math.floor(originalWidth * scaleFactor);
    const height = Math.floor(originalHeight * scaleFactor);

    let compressedResizedBuffer = await sharp(inputBuffer)
      .resize({ width, height })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Get the size of the resized image in kilobytes (KB)
    let outputSize = (
      Buffer.byteLength(compressedResizedBuffer) / 1024
    ).toFixed(2);
    // Write the compressed and resized image to the output file
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    if (parseInt(inputSize) <= parseInt(outputSize)) {
      await fs.promises.writeFile(outputPath, inputBuffer);
    } else {
      await fs.promises.writeFile(outputPath, compressedResizedBuffer);
    }
    console.log(`Image compression and resizing successful for ${inputPath}`);
    console.log(`initial size: ${inputSize} KB`);
    console.log(
      `Resized Size: ${
        parseInt(inputSize) > parseInt(outputSize) ? outputSize : inputSize
      } KB`
    );
  } catch (error) {
    console.error(
      `An error occurred during image compression and resizing for ${inputPath}:`,
      error
    );
  }
};

// Function to recursively process files in a directory
const processFilesRecursively = async (
  inputDirectory,
  outputDirectory,
  maxWidth
) => {
  try {
    const files = await fs.promises.readdir(inputDirectory);

    for (const file of files) {
      const inputPath = path.join(inputDirectory, file);
      const outputPath = path.join(outputDirectory, file);

      const stats = await fs.promises.stat(inputPath);
      if (stats.isDirectory()) {
        // Create a subdirectory in the output directory
        const subOutputDirectory = path.join(outputDirectory, file);
        await fs.promises.mkdir(subOutputDirectory, { recursive: true });

        // Recursively process files in the subdirectory
        await processFilesRecursively(inputPath, subOutputDirectory, maxWidth);
      } else {
        // Compress and resize the image
        await compressAndResizeImage(inputPath, outputPath, maxWidth);
      }
    }
  } catch (error) {
    console.error("An error occurred while processing files:", error);
  }
};

module.exports = { processFilesRecursively };
