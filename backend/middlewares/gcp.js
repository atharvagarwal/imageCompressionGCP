"use strict";

//   title: Upload a directory to a bucket.
//   description: Uploads full hierarchy of a local directory to a bucket.
//   usage: node files.js upload-directory <bucketName> <directoryPath>

function main(
  bucketName = "atharv-image-comp-1",
  directoryPath = "./outputDirectory/images/"
) {
  return new Promise((resolve, reject) => {
    // Imports the Google Cloud client library
    const { Storage } = require("@google-cloud/storage");

    // Creates a client
    const storage = new Storage();

    const { promisify } = require("util");
    const fs = require("fs");
    const path = require("path");

    const readdir = promisify(fs.readdir);
    const stat = promisify(fs.stat);

    async function* getFiles(directory = ".") {
      for (const file of await readdir(directory)) {
        const fullPath = path.join(directory, file);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          yield* getFiles(fullPath);
        }

        if (stats.isFile()) {
          yield fullPath;
        }
      }
    }

    async function uploadDirectory() {
      const bucket = storage.bucket(bucketName);
      let successfulUploads = 0;

      for await (const filePath of getFiles(directoryPath)) {
        try {
          const dirname = path.dirname(directoryPath);
          const destination = path.relative(dirname, filePath);

          await bucket.upload(filePath, { destination });

          console.log(`Successfully uploaded: ${filePath}`);
          successfulUploads++;
        } catch (e) {
          console.error(`Error uploading ${filePath}:`, e);
        }
      }

      console.log(
        `${successfulUploads} files uploaded to ${bucketName} successfully.`
      );
      resolve(successfulUploads);
    }

    uploadDirectory().catch((error) => {
      console.error("Error uploading directory:", error);
      reject(error);
    });
  });
}

module.exports = { main };
