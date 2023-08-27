//import packages
const express = require("express");
const multer = require("multer");
const app = express();
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const PORT = 3000;
//middlewares or custom script/function imports
const {extractZipFile } = require("./middlewares/zip.js");
const { processFilesRecursively } = require("./middlewares/compression.js");
const {
  fileExists,
  directoryExists,
  deleteFile,
  deleteDirectoryRecursive,
} = require("./middlewares/cleanup.js");
const {main}=require("./middlewares/gcp.js")
//middlewares express
app.use(cors());
app.use(express.json());
//multer middleware
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Specify the input and output directories
const inputDirectory = "inputDirectory";
const outputDirectory = "outputDirectory";

// Set the maximum width for resizing
let maxWidth = 1000; // Adjust as needed

// Ensure the output directory exists
if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory);
}

//http endpoints

//DOWNLOAD ZIP FILES
/*app.get("/download-zip", async (req, res) => {
  const zipFilePath = path.join(__dirname, "output.zip");
  const zipFileStream = fs.createReadStream(zipFilePath);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=output.zip");

  zipFileStream.pipe(res);
});*/

//UPLOAD FILES and PROCESS THEM
app.post("/upload", upload.single("zipFile"), async (req, res) => {
  try {
    const compressionPercentage = parseInt(req.body.compressionPercentage);
    const uploadedZipFile = req.file;

    if (!uploadedZipFile) {
      return res.status(400).send("No zip file selected.");
    }

    const uploadPath = path.join(__dirname, "uploads");
    fs.mkdirSync(uploadPath, { recursive: true });

    const zipFilePath = path.join(uploadPath, uploadedZipFile.originalname);
    fs.writeFileSync(zipFilePath, uploadedZipFile.buffer);

    extractZipFile();
    await processFilesRecursively(inputDirectory, outputDirectory, compressionPercentage);
    main().then(()=>{
      res.status(200).json({ message: "Zip file uploaded and processed successfully." });
    }).catch((err)=>{
      res.status(500).json({ message: "Error in uploading the zip file" + err });
    })

    
  } catch (error) {
    console.error("Error during upload and processing:", error);
    res.status(500).json({ error: "An error occurred during upload and processing." });
  }
});


//CLEANUP FUNCTIONS AND ENDPOINT

app.post("/cleanup", async (req, res) => {
  try {
    const cleanupTasks = [];

    // Check if output.zip exists and delete it
    const outputZipPath = path.join(__dirname, "output.zip");
    if (await fileExists(outputZipPath)) {
      cleanupTasks.push(deleteFile(outputZipPath));
    }

    // Check if inputFolder exists and delete it
    const inputDirectoryPath = path.join(__dirname, "inputDirectory");
    if (await directoryExists(inputDirectoryPath)) {
      cleanupTasks.push(deleteDirectoryRecursive(inputDirectoryPath));
    }

    // Check if outputFolder exists and delete it
    const outputDirectoryPath = path.join(__dirname, "outputDirectory");
    if (await directoryExists(outputDirectoryPath)) {
      cleanupTasks.push(deleteDirectoryRecursive(outputDirectoryPath));
    }

    // Check if uploads folder exists and delete it
    const uploadsDirectoryPath = path.join(__dirname, "uploads");
    if (await directoryExists(uploadsDirectoryPath)) {
      cleanupTasks.push(deleteDirectoryRecursive(uploadsDirectoryPath));
    }

    // Wait for all cleanup tasks to complete
    await Promise.all(cleanupTasks);

    console.log("Cleanup completed successfully.");
    res.status(200).send({ message: "Cleanup completed successfully" });
  } catch (error) {
    console.error("An error occurred during cleanup:", error);
    res.status(500).send({ message: "Cleanup failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
