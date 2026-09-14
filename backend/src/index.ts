import "dotenv/config";
import express from "express";
import cors from "cors";
import bookingsRouter from "./routes/bookings";
import resourcesRouter from "./routes/resources";
import donationsRouter from "./routes/donations";
import adminRouter from "./routes/admin";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/bookings", bookingsRouter);
app.use("/resources", resourcesRouter);
app.use("/donations", donationsRouter); // also serves GET /donations/campaigns
app.use("/admin", adminRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Riverside API listening on port ${PORT}`);
});
