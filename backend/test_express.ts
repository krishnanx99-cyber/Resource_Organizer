import express from "express";
const app = express();
app.get("/test", (_req, res) => {
  const obj = { id: "1", whySaved: "test", title: "hello" };
  res.json(obj);
});
app.listen(3001, () => console.log("Test server on 3001"));