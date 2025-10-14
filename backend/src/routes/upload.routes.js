import dotenv from "dotenv";
import express from 'express';
import fileUpload from "express-fileupload";
import fetch from "node-fetch";
import FormData from "form-data";


dotenv.config();

const router = express.Router();
router.use(fileUpload());
router.use(express.json({ limit: '50mb' })); // For encrypted data

router.post('/uploadToPinata', async(req, res)=> {
  console.log('Uploading encrypted data to IPFS...');
  try{
      const { encryptedData, metadata } = req.body;
      
      if(!encryptedData){
        return res.status(400).json({ message: 'Encrypted data is required!'});
      }

      // Upload encrypted blob to Pinata
      const formData = new FormData();
      const blob = Buffer.from(encryptedData, 'utf-8');
      formData.append("file", blob, {
        filename: `encrypted-role-upgrade-${Date.now()}.txt`,
        contentType: 'text/plain'
      });

      // Add metadata if provided
      if (metadata) {
        formData.append('pinataMetadata', JSON.stringify({
          name: `role-upgrade-${metadata.patient || 'unknown'}-${Date.now()}`,
          keyvalues: metadata
        }));
      }

      const request = await fetch("https://uploads.pinata.cloud/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
          ...formData.getHeaders()
        },
        body: formData,
      });

      if (!request.ok) {
        const errText = await request.text();
        throw new Error(`Pinata upload failed: ${errText}`);
      }

      const response = await request.json();
      console.log("Pinata response: ", response);

      // Extract CID from response
      const cid = response.data?.cid;

      res.status(200).json({
        message: "Encrypted data uploaded successfully",
        cid: cid,
        pinataResponse: response
      });

  }catch(error){
    console.error("Error in /uploadToPinata route: ", error);
    return res.status(500).json({ message: 'Error uploading', error: error.message});
  }
});

export default router;