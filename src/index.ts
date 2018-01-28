'use strict';

import * as firebase from "firebase";
import * as request from "request";
import * as MeCab from "mecab-async";
import * as config from "./config";
import * as dict from "./dict";

// main_rountine
const mainRoutine = () => {
  console.log("Google Home Firebase Proxy is Started.");

  firebase.initializeApp(config.firebase);

  const db = firebase.database();
  const ref = db.ref("assistant");

  const mecab = new MeCab();

  let isFirst = true;

  ref.on('value', (dataSnapshot) => {
    if (isFirst) {
      // skip the first notification because it will definitely come.
      isFirst = false;
    } else {
      const phrase: string = dataSnapshot.child("phrase").val();
      let phrase_target: string = "";
      let phrase_action: string = "";

      if (!phrase) {
        console.log("get phrase error.");
        return;
      }
      console.log("phrase: " + phrase);

      mecab.parseFormat(phrase, (err, results) => {
        if (err) {
          console.log("parse phrase error.");
          return;
        }

        results.map((result) => {
          if (result.lexical === "名詞") {
            if (phrase_target === "") {
              phrase_target = result.original;
            } else {
              phrase_action = phrase_action + result.original;
            }
          } else if (result.lexical !== "助詞") {
            phrase_action = phrase_action + result.original;
          }
        });

        let target: string = "";
        let action: string = "";
        if (phrase_target in dict.target) {
          target = dict.target[phrase_target];
        }

        if (phrase_action in dict.action) {
          action = dict.action[phrase_action];
        }

        if (target === "" || action === "") {
          console.log("unknown target or action");
          console.log("phrase target: " + phrase_target
                      + " phrase action: " + phrase_action);
          return;
        }

        console.log("target: " + target + " action: " + action);
        const options = {
          url: config.url,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "User-Agent": "GHFP"
          },
          json: {
            "target": target,
            "action": action
          }        
        };

        request(options, (error, response, body) => {
          if (error) {
            console.log(error);
            return;
          }
          console.log(response.statusCode + " " + body);
        });
      });
    }
  });
};

mainRoutine();
