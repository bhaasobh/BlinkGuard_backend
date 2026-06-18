import {
  getLatestUnreadEmail
} from "../services/gmail.service.js";

import {
  analyzeTxt
} from "./scan.controller.js";

export const checkLatestGmail =
  async (req, res) => {

    try {

      const userId =
        req.user.userId;

      const email =
        await getLatestUnreadEmail(
          userId
        );

      if (!email) {
        return res.json({
          found: false,
        });
      }

      console.log("EMAIL CONTENT:");
console.log(email.content);

req.body.content =
  email.snippet;

      return analyzeTxt(
        req,
        res
      );

    } catch (err) {

      res.status(500).json({
        error: err.message,
      });
    }
};