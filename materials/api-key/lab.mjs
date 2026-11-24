const practiceKey = "itzukan-demo-key";
const products = { products: [{ id: 101, name: "りんご" }, { id: 105, name: "バナナ" }] };
const keyInput = document.querySelector("#practice-key");
const fillKey = document.querySelector("#fill-key");
const clearKey = document.querySelector("#clear-key");
const sendRequest = document.querySelector("#send-request");
const requestOutput = document.querySelector("#request-output");
const responseStatus = document.querySelector("#response-status");
const responseOutput = document.querySelector("#response-output");

fillKey.addEventListener("click", () => {
  keyInput.value = practiceKey;
  sendRequest.focus();
});
clearKey.addEventListener("click", () => {
  keyInput.value = "";
  keyInput.focus();
});
sendRequest.addEventListener("click", () => {
  const key = keyInput.value.trim();
  const accepted = key === practiceKey;
  const header = accepted ? practiceKey : "[入力したAPIキー]";

  requestOutput.textContent = key ? `GET /products\nAuthorization: Bearer ${header}` : "GET /products";
  responseStatus.textContent = accepted ? "200 OK · 商品一覧を取得しました" : "401 Unauthorized · 有効なAPIキーが必要です";
  responseStatus.dataset.result = accepted ? "success" : "retry";
  const challenge = 'WWW-Authenticate: Bearer realm="api-key-practice"';
  const payload = accepted ? products : { error: "unauthorized" };
  responseOutput.textContent = (accepted ? "" : challenge + "\n\n") + JSON.stringify(payload, null, 2);
  responseOutput.hidden = false;
});
keyInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.isComposing) sendRequest.click();
});
for (const control of [keyInput, fillKey, clearKey, sendRequest]) control.disabled = false;
