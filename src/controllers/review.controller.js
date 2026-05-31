import UserFeedback
from "../models/UserFeedback.js";

export const addReview =
async (req, res) => {

  try {

    const {
      scanId,
      isAccurate,
      reviewText,
    } = req.body;

    const feedback =
      await UserFeedback.create({

        feedback_id:
          scanId,
          user_report:`
          Accurate: ${isAccurate}
          Review: ${reviewText}`,
      });

    res.status(201).json({
      success: true,
      feedback,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error:
        "Failed to save review",
    });
  }
};