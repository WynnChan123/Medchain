import dotenv from "dotenv";
import express from 'express';
import fileUpload from "express-fileupload";
import fetch from "node-fetch";
import FormData from "form-data";
import axios from "axios";


dotenv.config();

const router = express.Router();
router.use(fileUpload());
router.use(express.json({ limit: '50mb' })); // For encrypted data

router.get("/getABI/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
    const chainid = 11155111; // Sepolia

    const url = `https://api.etherscan.io/v2/api?module=contract&action=getabi&address=${address}&chainid=${chainid}&apikey=${ETHERSCAN_API_KEY}`;

    console.log("Fetching ABI from Etherscan V2...");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Etherscan API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log("Etherscan V2 response:", data);

    if (data.status !== "1" || !data.result) {
      return res.status(400).json({
        error: "Failed to fetch ABI",
        details: data.message || data.result,
      });
    }

    const abi = JSON.parse(data.result);
    return res.status(200).json({ abi });
  } catch (error) {
    console.error("Error fetching ABI:", error);
    res.status(500).json({
      error: "Failed to fetch ABI",
      message: error.message,
    });
  }
});



router.post("/uploadToPinata", async (req, res) => {
  console.log("Uploading encrypted data to IPFS...");

  try {
    const { encryptedData, metadata } = req.body;
    const payloadSize = JSON.stringify(req.body).length;
    console.log(`Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

    if (!encryptedData) {
      return res.status(400).json({ message: "Encrypted data is required!" });
    }

    // Convert encrypted data to Buffer
    const blob = Buffer.from(encryptedData, "utf-8");

    // Create FormData payload
    const formData = new FormData();
    formData.append("file", blob, {
      filename: `encrypted-role-upgrade-${Date.now()}.txt`,
      contentType: "text/plain",
    });

    // Add optional metadata
    if (metadata) {
      formData.append(
        "pinataMetadata",
        JSON.stringify({
          name: `role-upgrade-${metadata.patient || "unknown"}-${Date.now()}`,
          keyvalues: metadata,
        })
      );
    }

    // Upload via Axios
    const response = await axios.post(
      "https://uploads.pinata.cloud/v3/files",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity, // important for large files
        maxContentLength: Infinity,
        timeout: 60000, // 60s timeout
      }
    );

    console.log("Pinata response:", response.data);

    const cid = response.data?.data?.cid;
    res.status(200).json({
      message: "Encrypted data uploaded successfully",
      cid,
      pinataResponse: response.data,
    });
  } catch (error) {
    console.error("Error in /uploadToPinata route:", error);
    return res.status(500).json({
      message: "Error uploading",
      error: error.message,
    });
  }
});

export default router;