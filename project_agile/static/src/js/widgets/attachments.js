// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.attachments', require => {
    "use strict";
    var BaseWidgets = require('project_agile.BaseWidgets');
    var ModelList = require('project_agile.model_list');
    var dialog = require('project_agile.dialog');
    var _t = require('web.core')._t;

    const AttachmentsWidget = BaseWidgets.AgileBaseWidget.extend({
        template: "project.agile.attachments",
        multiple: true,
        convertTimeout: 3000,
        custom_events: {
            'remove_attachment': function (evt) {
                this.attachmentsList.removeItem(evt.data.id);
            }
        },
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            this._require_prop("res_id");
            this._require_prop("res_model");
            this._require_prop("attachments");
            // All those attachments are already stored, so set downloadable to true
            this.attachments.forEach(e=>e.downloadable = true);
        },
        renderElement() {
            this._super();
            this.$(".attachments-input").attr("multiple", this.multiple);
            this.attachmentsList = new ModelList.ModelList(this, {
                model: "ir.attachment",
                data: this.attachments,
                ModelItem: AttachmentsItem,
            });
            this.attachmentsList.appendTo(this.$el);
        },
        start() {
            this.initDragAndDrop();
            this.$(".upload-files").click(e => this.$(".attachments-input").trigger("click"));
            this.$(".attachments-input").change(e => this.uploadFiles(e.target.files));
            return this._super();
        },
        initDragAndDrop() {
            let dragCounter = 0;
            let removeTimeout;
            let captureDragover = false;
            let finalizeWave = () => {
                Waves.calm(this.$el[0]);
                removeTimeout = setTimeout(() => this.$el.removeClass('waves-effect'), 700);
                this.$el.removeClass('is-dragover');
            };
            this.$el.on('drag dragstart dragend dragover dragenter dragleave drop', e => {
                e.preventDefault();
                e.stopPropagation();
            })
                .on('dragover dragenter dragstart', e => {
                    this.$el.addClass('is-dragover');
                    if ((e.type === "dragenter" || e.type === "dragstart") && dragCounter++ == 0) {
                        captureDragover = true;
                    }
                    if (e.type === "dragover" && captureDragover) {
                        captureDragover = false;
                        clearTimeout(removeTimeout);
                        this.$el.addClass('waves-effect');
                        Waves.ripple(this.$el[0], {
                            wait: 999999,
                            position: { // This position relative to HTML element.
                                x: e.originalEvent.layerX, //px
                                y: e.originalEvent.layerY  //px
                            }
                        });
                    }
                })
                .on('dragleave dragend drop', e => {
                    if (e.type === "dragleave" && --dragCounter == 0) {
                        finalizeWave();
                    }
                })
                .on('drop', e => {
                    finalizeWave();
                    let droppedFiles = e.originalEvent.dataTransfer.files;
                    this.uploadFiles(droppedFiles);
                    dragCounter = 0;
                });
        },
        uploadFiles(fileList) {
            if (fileList.length > 0) {
                for (let file of fileList) {
                    // let newAttachmentItem = new AttachmentsItem(this, {
                    //     // attributes: {"data-id": item.id},
                    //     file: file,
                    //     dataset: data.getDataSet("ir.attachment"),
                    //     order_field: AttachmentsItem.sort_by
                    // });
                    this.attachmentsList.addItem({
                        // attributes: {"data-id": item.id},
                        file: file,
                        res_id: this.res_id,
                        res_model: this.res_model,
                        convertTimeout: this.convertTimeout,
                        dataset: data.getDataSet("ir.attachment"),
                        order_field: AttachmentsItem.sort_by
                    });
                }
            }
        }
    });
    /**
     * This widgets looks and reacts differently according to its state.
     * It can be downloadable, which means that attachment is already stored, and download can be initiated.
     * When widget has downloadable set to true, it enables user to delete the attachment.
     * When user selects a file, or drag&drop file to AttachmentsWidget, an non downloadable AttachmentsItem widget
     * gets created and rendered. Until file gets uploaded and prepared for download, this widget provides user
     * with visual feedback that file upload is in progress, and gives user an ability to abort file upload.
     */
    const AttachmentsItem = ModelList.AbstractModelListItem.extend({
        template: "project.agile.attachments.item",
        max_upload_size: 25 * 1024 * 1024, // 25Mo
        init(parent, options) {
            this._super(parent, options);
            this.record = this.record || {};
            if (!this.record.downloadable) {
                this._require_obj("record", ['file', 'res_model', 'res_id', 'convertTimeout']);
                this.record.name = this.record.file.name;
            }
        },
        willStart() {
            let superPromise = this._super();
            if(this.record.downloadable){
                return $.when(superPromise, this.prepareUserImage());
            }
            return superPromise;
        },
        prepareUserImage() {
            return data.cache.get("get_user", {id: this.record.create_uid[0]}).then(user => {
                this.user_image_url = data.getImage("res.users", user.id, user.write_date);
            });
        },
        renderElement() {
            this._super();
            if (this.record.downloadable) {
                this.$el.addClass("downloadable");
                this.$el.addClass("complete");
            }
        },
        start() {
            if (this.record.downloadable) {
                this.$(".delete").click(this.remove.bind(this));
            } else { // This is a case of uploading/creating new attachment
                this.loadFile(this.record.file);
                this.$(".abort").click(this.destroy.bind(this));
                this.$(".retry").click(() => {
                    this.$el.removeClass("with-error");
                    this.loadFile(this.record.file)
                });

            }
            this.$(".tooltipped").tooltip();
            return this._super();
        },
        loadFile(file) {
            console.log(file.name);
            if (file.size > this.max_upload_size) {
                this.$el.addClass("with-error");
                this.setError(_t("File exceed the maximum file size of ") + this.max_upload_size / 1024 / 1024 + "MB");
                this.setProgress(0);
                this.$(".retry").hide();
                return false;
            }
            this.setStatus(_t("Preparing file..."));
            this.setProgress(false);
            let fileReader = new FileReader();
            let self = this;
            fileReader.onloadend = upload => {
                let data = upload.target.result;
                data = data.split(',')[1];
                self.uploadFile(data);
            };
            fileReader.readAsDataURL(file);
        },
        setError(error) {
            this.$(".error").text(error);
        },
        setStatus(status) {
            this.$(".status").text(status);
        },
        setProgress(progress) {
            if (progress === false) { //show indeterminate progress bar
                this.$(".progress").empty().append($('<div class="indeterminate"/>'));
            } else if (Number(progress) === progress && progress >= 0 && progress <= 1) {
                this.$(".progress").empty().append($('<div class="determinate" style="width: ' + progress * 100 + '%"/>'));
            } else {
                throw new Error("Illegal argument");
            }
        },
        uploadFile(file_base64) {
            if (this.record.file.size === false) {
                this.setError(_t("Browser couldn't load file"));
            } else {
                this.setStatus(_t("Uploading file..."));
                data.getDataSet("ir.attachment").create({
                    res_id: this.record.res_id,
                    res_model: this.record.res_model,
                    name: this.record.file.name,
                    datas: file_base64,
                    datas_fname: this.record.file.name
                }).then(this.onFileUploaded.bind(this), this.onFileUploadError.bind(this));
            }
        },
        onFileUploaded(id) {
            this.setId(id);
            this.setProgress(1);
            this.$(".delete").click(this.remove.bind(this));
            this.$el.addClass("complete");
            this.attachmentLoaded = data.getDataSet("ir.attachment").read_ids([id], ["name", "datas_fname", "local_url", "create_uid", "create_date"]);
            setTimeout(this.convertToLink.bind(this), this.record.convertTimeout);
        },
        onFileUploadError() {
            this.setProgress(0);
            this.$el.addClass("with-error");
            this.setError(_t("Error while uploading file"));
        },
        convertToLink() {
            this.attachmentLoaded.then(result => {
                let attachment = result[0];
                Object.assign(this.record, attachment);
                this.record.downloadable = true;
                this.$el.addClass("downloadable");
                this.$(".name").html(`<a href="${this.record.local_url}" download="${this.record.datas_fname}" target="_blank">${this.record.name}</a>`);
                this.prepareUserImage().then(() => {
                    let image = $(`<img src="${this.user_image_url}" class="circle valign image tooltipped"
                    data-position="bottom" data-delay="50" data-tooltip="${this.record.create_uid[1]} @ ${this.record.create_date}"/>`);
                    image.insertBefore(this.$(".meta"));
                    image.tooltip();
                });

            });
        },
        remove() {
            dialog.confirm(_t("Delete attachment"), _t("Are you sure you want to delete this attachment?"), _t("yes")).done(() => {
                this.dataset.unlink([this.record.id]).then(() => {
                    this.trigger_up("remove_attachment", {id: this.record.id});
                });
            });
        },
        destroy() {
            if (!this.__destroying) {
                this.__destroying = true;
                this.$el.addClass("fade-out");
                let self = this;
                this.$el.one('webkitAnimationEnd oanimationend msAnimationEnd animationend', e => self.destroy());
            } else {
                this._super();
            }
        }
    });
    AttachmentsItem.sort_by = "create_date";
    return {
        AttachmentsWidget,
        AttachmentsItem
    }
});
