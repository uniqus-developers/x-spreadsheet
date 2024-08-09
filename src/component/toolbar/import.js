import { cssPrefix } from "../../config";
import { readExcelFile } from "../../utils";
import Button from "../button";
import { h } from "../element";
import FormField from "../form_field";
import FormInput from "../form_input";
import FormSelect from "../form_select";
import { xtoast } from "../message";
import Modal from "../modal";
import IconItem from "./icon_item";

export default class Import extends IconItem {
  constructor() {
    super("import");
    this.file = null;
  }

  click() {
    super.click(false);

    const InputFormField = new FormField(
      new FormInput("200px", "Select File")
        .attr("type", "file")
        .attr("accept", ".xls,.xlsx"),
      {
        required: true,
      },
      "Select File:",
      100
    );

    const SelectFormField = new FormField(
      new FormSelect(true, "", [], "216px"),
      {
        required: true,
      },
      "Select Sheets:",
      100
    );

    SelectFormField.el.css("display", "flex").css("align-items", "center");

    const InputFormFieldWrapper = h("div", `${cssPrefix}-form-fields`).children(
      InputFormField.el
    );

    const SelectFormFieldWrapper = h(
      "div",
      `${cssPrefix}-form-fields`
    ).children(SelectFormField.el);

    const Buttons = h("div", `${cssPrefix}-buttons`).children(
      new Button("cancel").on("click", () => {
        this.file = null;
        modal.hide();
      }),
      new Button("import", "primary").on("click", () => {
        const selectedSheets = SelectFormField.input.selectedItems ?? [];
        if (!this.file || selectedSheets.length < 1) {
          modal.hide();
          xtoast("Import Error!", "Please select the file", () => {
            modal.show();
          });
          return;
        } else {
          this.save(selectedSheets);
          modal.hide();
        }
      })
    );

    InputFormField.input.el.on("change", async (event) => {
      const {
        target: { files },
      } = event;
      if (files?.length) {
        const workbook = await readExcelFile(files[0]);
        this.file = workbook;
        if (workbook?.SheetNames?.length) {
          const { SheetNames } = workbook;
          SelectFormField.input.val(SheetNames[0]);
          SelectFormField.input.selectedItems = [SheetNames[0]];
          SelectFormField.input.suggest.setItems(
            SheetNames.map((name) => ({
              key: name,
              title: name,
            }))
          );
          SelectFormField.input.suggest.setSelectedItems(
            SelectFormField.input.selectedItems
          );
        }
      }
    });

    const modal = new Modal(
      "Import",
      [InputFormFieldWrapper.el, SelectFormFieldWrapper.el, Buttons.el],
      "400px"
    );

    modal.show();
  }

  save(selectedSheets) {
    this.change(this.tag, {
      file: this.file,
      selectedSheets,
    });
    this.file = null;
  }
}
