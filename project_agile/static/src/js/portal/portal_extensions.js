// Copyright 2017-2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
"use strict";
odoo.define('project_portal_task_edit', function (require) {

    var rpc = require('web.rpc');
    require('web_editor.summernote'); // wait that summernote is loaded
    require('web.dom_ready');
    /*
     * This file is intended to add interactivity to survey forms rendered by
     * the website engine.
     */

    // var interested_form = $('.interested_partner_assign_form');
    // var desinterested_form = $('.desinterested_partner_assign_form');
    // var opp_stage_buttons = $('.opp-stage-button');
    // var new_opp_form = $('.new_opp_form');

    let summernoteOptions = {
        focus: false,
        height: 180,
        toolbar: [
            ['style', ['style']],
            ['font', ['bold', 'italic', 'underline', 'clear']],
            ['fontsize', ['fontsize']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['table', ['table']],
            ['insert', ['link', 'picture']],
            ['history', ['undo', 'redo']],
            ['fullscreen',['fullscreen']]
        ],
        prettifyHtml: false,
        styleWithSpan: false,
        inlinemedia: ['p'],
        lang: "odoo"
    };

    $('.edit_task_form .description.summernote').summernote(summernoteOptions);
    $('.new_task_form .description.summernote').summernote(summernoteOptions);

    $('.new_task_confirm').on('click', function (e) {
        var $btn = $(this);
        $btn.prop('disabled', true);
        rpc.query({
            model: 'project.task',
            method: 'create_task_portal',
            args: [{
                name: $('.new_task_form .name').val(),
                priority_id: parseInt($('.new_task_form .priority').find(":selected").attr('data')),
                type_id: parseInt($('.new_task_form .type').find(":selected").attr('data')),
                project_id: parseInt($('.new_task_form .project').find(":selected").attr('data')),
                date_deadline: $('.new_task_form .date_deadline').val(),
                description: $('.new_task_form .description.summernote').code(),
            }],
        })
            .done(function (response) {
                if (response.errors) {
                    $('#new-opp-dialog .alert').remove();
                    $('#new-opp-dialog div:first').prepend("<div class='alert alert-danger'>" + response.errors + "</div>");
                    $btn.prop('disabled', false);

                }
                else {
                    window.location = '/my/task/' + response.id;
                }
            })
            .fail(function () {
                $btn.prop('disabled', false);
            });
        return false;
    });
    $('.edit_task_confirm').on('click', function () {
        var $btn = $(this);
        $btn.prop('disabled', true);
        rpc.query({
            model: 'project.task',
            method: 'update_task_portal',
            args: [[parseInt($('.edit_task_form .task_id').val())], {
                name: $('.edit_task_form .name').val(),
                type_id: parseInt($('.edit_task_form .type').find(":selected").attr('data')),
                priority_id: parseInt($('.edit_task_form .priority').find(":selected").attr('data')),
                date_deadline: $('.edit_task_form .date_deadline').val(),
                description: $('.edit_task_form .description.summernote').code(),
            }],
        })
            .fail(function () {
                $btn.prop('disabled', false);
            })
            .done(function () {
                window.location.reload();
            });
        return false;
    });

    $("div.input-group span.fa-calendar").on('click', function (e) {
        $(e.currentTarget).closest("div.date").datetimepicker({
            icons: {
                time: 'fa fa-clock-o',
                date: 'fa fa-calendar',
                up: 'fa fa-chevron-up',
                down: 'fa fa-chevron-down'
            },
        });
    });

    $('.edit_task_form .type, .new_task_form .type').on('change', function () {
        let form = $(this).closest("form");
        let selectedType = $(this).find(":selected");
        let allowed_priority_ids = JSON.parse(selectedType.attr("data-priorities"));
        let default_priority_id = JSON.parse(selectedType.attr("data-default-priority"));
        form.find("select.priority option").each((i, opt) => {
            let option = $(opt);
            if (allowed_priority_ids.includes(parseInt(option.attr("data")))) {
                option.show();
            } else {
                option.hide();
            }
        });
        let selectedPriority = parseInt(form.find("select.priority option:selected").attr("data"));
        if(!allowed_priority_ids.includes(selectedPriority)){
            form.find("select.priority option[data=" + default_priority_id + "]").prop('selected', true);
            form.find("select.priority").change();
        }
    });

    $('.new_task_form .project').on('change', function () {
        let form = $(this).closest("form");
        let selectedProject = $(this).find(":selected");
        let allowed_task_types_ids = JSON.parse(selectedProject.attr("data-types"));
        let default_task_type_id = parseInt(selectedProject.attr("data-default-type"));
        form.find("select.type option").each((i, opt) => {
            let option = $(opt);
            if (allowed_task_types_ids.includes(parseInt(option.attr("data")))) {
                option.show();
            } else {
                option.hide();
            }
        });
        let selectedType = parseInt(form.find("select.type option:selected").attr("data"));
        if(!allowed_task_types_ids.includes(selectedType)){
            form.find("select.type option[data=" + default_task_type_id + "]").prop('selected', true);
            form.find("select.type").change();
        }
    });
    $('.new_task_form .project').change();

    $('[data-toggle="tooltip"]').tooltip();
    $("button[name='new_task'], button[name='new_task']").click(function(e){
        let btn = $(this);
        let modal = $(btn.attr("data-target") +">.modal-dialog");
        modal.removeClass("container");
        modal.find(".note-editor").removeClass("fullscreen");
        modal.find(".note-editable.panel-body").css("height","180px");
    });
    $('button[data-event="fullscreen"]').click(function(evt){
        $(this).closest(".modal-dialog").toggleClass("container");
    });

});
