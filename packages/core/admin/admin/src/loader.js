(() => {

  const script = document.currentScript;

  const loadWidget = () => {
    const widget = document.createElement("div");

    const widgetStyle = widget.style;
    // widgetStyle.display = "none";
    // widgetStyle.boxSizing = "border-box";
    // widgetStyle.width = "400px";
    // widgetStyle.height = "647px";
    // widgetStyle.position = "absolute";
    // widgetStyle.top = "40px";
    // widgetStyle.right = "40px";

    const iframe = document.createElement("iframe");

    const iframeStyle = iframe.style;
    iframeStyle.boxSizing = "borderBox";
    iframeStyle.position = "absolute";
    iframeStyle.right = 0;
    iframeStyle.bottom = 0;
    // iframeStyle.width = "100%";
    iframeStyle.height = "500px";
    iframeStyle.border = 0;
    iframeStyle.margin = 0;
    iframeStyle.padding = 0;
    iframeStyle.backgroundColor = "transparent";
    // iframeStyle.width = "500px";

    widget.appendChild(iframe);

    const greeting = script.getAttribute("data-greeting");

    const connectToSocket = () => {
      const socket = io("http://localhost:3000");

      socket.on("connect", () => {
        console.log("connected", socket.connected); // true
      });

      socket.on("puppeteer-joined", (event) => {
        console.log("puppeteer joined – let's record!");
        let stopFn = rrwebRecord({
          emit(event) {
            socket.emit("eventMessage", event);
          },
          // packFn: rrweb.pack,
        });
      });

      socket.on("suggestion", (event) => {
        iframe.contentWindow.postMessage(event, "http://localhost:5173");
      });

      socket.emit("browse", { roomId: "client-123" });
    }

    const api = {

      sendMessage(message) {
        iframe.contentWindow.postMessage({
          sendMessage: message
        }, "http://localhost:5173");
      },

      show() {
        widget.style.display = "block";
      },

      hide() {
        widget.style.display = "none";
      },

      toggle() {
        const display = window.getComputedStyle(widget, null).display;
        widget.style.display = display === "none" ? "block" : "none";
      },

      onHide() { }

    }

    iframe.addEventListener("load", () => {

      // window.addEventListener("getWidgetApi", () => {

      //     const event = new CustomEvent('widgetApi', { detail: api });
      //     window.dispatchEvent(event);

      // });

      // window.addEventListener("message", evt => {

      //     if (evt.origin !== "http://localhost:1337") {
      //         return;
      //     }

      //     if (evt.data === "hide") {
      //         api.hide();
      //         api.onHide();
      //     }

      // });

      iframe.contentWindow.postMessage({ greeting }, "http://localhost:5173");
      widgetStyle.display = "block";
    });

    const license = script.getAttribute("data-license");
    const widgetUrl = `http://localhost:5173`;

    iframe.src = widgetUrl;

    document.body.appendChild(widget);

    // Create a new script element
    const rrwebScript = document.createElement('script');

    // Set the src attribute to the URL of the RRWeb script
    rrwebScript.src = 'https://cdn.jsdelivr.net/npm/rrweb@latest/dist/record/rrweb-record.min.js';

    // Append the script element to the document's head
    document.head.appendChild(rrwebScript);

    // Create a new script element
    const socketIoScript = document.createElement('script');

    // Set the src attribute to the URL of the RRWeb script
    socketIoScript.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';

    socketIoScript.addEventListener('load', connectToSocket);

    // Append the script element to the document's head
    document.head.appendChild(socketIoScript);
  }


  if (document.readyState === "complete") {
    loadWidget();
  } else {
    document.addEventListener("readystatechange", () => {
      if (document.readyState === "complete") {
        loadWidget();
      }
    });
  }
})();
