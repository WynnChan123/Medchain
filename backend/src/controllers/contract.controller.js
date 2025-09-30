import { fetchContractABI } from "../services/abi.service.js";

export async function getContractABI(req, res) {
  const { address } = req.params;

  try {
    const abi = await fetchContractABI(address);
    res.json({ success: true, abi });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
