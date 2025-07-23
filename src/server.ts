import app from "./app";
import { connectDB } from "./config/db";
import { initGameAutomation } from "./utils/game-automation";


const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    initGameAutomation();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }); 