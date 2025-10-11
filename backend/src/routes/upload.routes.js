import dotenv from "dotenv";
import express from 'express';
import fileUpload from "express-fileupload";
import fetch from "node-fetch";
import FormData from "form-data";

dotenv.config();

const router = express.Router();
router.use(fileUpload());

router.post('/uploadToPinata', async(req, res)=> {
  console.log('Uploading files to IPFS...');
  try{
      const { license, id, proof } = req.files || {};
      if(!license || !id || !proof){
        return res.status(400).json({ message: 'All 3 files are required for upload!'});
      }

      async function uploadFileToPinata(file){
        try{
          const formData = new FormData();
          formData.append("file", file.data, file.name);

          const request = await fetch("https://uploads.pinata.cloud/v3/files", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PINATA_JWT}`
            },
            body: formData,
          });

          if (!request.ok) {
            const errText = await request.text();
            throw new Error(`Pinata upload failed: ${errText}`);
          }

          const response = await request.json();
          console.log("Pinata response: ",response);
          return response;
        }catch(error){
          console.log("Failed to upload file to pinata", error);
          throw error;
        }
      }

      const [licenseRes, idRes, proofRes] = await Promise.all([
        uploadFileToPinata(license),
        uploadFileToPinata(id),
        uploadFileToPinata(proof),
      ]);

      res.status(200).json({
        message: "Files uploaded successfully",
        files: {
          license: licenseRes,
          id: idRes,
          proof: proofRes,
        },
      });
  }catch(error){
    console.error("Error in /upload route: ", error);
    return res.status(500).json({ message: 'Error uploading', error: error.message});
  }
});

export default router;