import { h } from "../element";
import Modal from "../modal";
import IconItem from "./icon_item";

export default class Import extends IconItem {
  constructor() {
    super("import");
  }

  click() {
    super.click(false);
    const input = h("input", "import-file");
    input.attr("type", "file").attr("accept", ".xls,.xlsx");
    const modal = new Modal("Select file", [input], "200px");
    input.on("change", (event) => {
      const {
        target: { files },
      } = event;
      if (files?.length) {
        this.change(this.tag, files[0]);
        modal.hide();
      }
    });
    modal.show();
  }
}
