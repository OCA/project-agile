// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.view.kanban_table', function (require) {
    "use strict";
    const data = require('project_agile.data');
    const core = require('project_agile.core');
    const BaseWidgets = require('project_agile.BaseWidgets');
    const TaskWidget = require('project_agile.widget.task').TaskWidget;
    const AgileModals = require('project_agile.widget.modal');
    const storage_service = require('project_agile.storage_service');
    require('sortable');
    const pluralize = require('pluralize');
    const DataServiceFactory = require('project_agile.data_service_factory');
    const task_service = DataServiceFactory.get("project.task", false);
    const AgileToast = require('project_agile.toast');

    const web_core = require('web.core');
    const qweb = web_core.qweb;
    const _t = web_core._t;

    const INDEX_NOT_FOUND = -1;

    function getFieldId(record, field) {
        return Array.isArray(record[field]) ? record[field][0] : record[field];
    }

    function getFieldName(record, field) {
        return Array.isArray(record[field]) ? record[field][1] : record[field];
    }

    class SwimlaneDefinition {
        /**
         *
         * @param kanbanTable - A reference to parent kanbanTable
         * @param field - Name of field that will be used for grouping cards
         * @param text - Will be shown in UI select-option when changing swimlane
         */
        constructor(kanbanTable, field, text, undefinedHeaderName = _t("Undefined"), headerTemplate = "project.agile.kanban_table.swimlane.header.simple") {
            this.kanbanTable = kanbanTable;
            this.field = field;
            this.text = text;
            this.undefinedHeaderName = undefinedHeaderName;
            this.headerTemplate = headerTemplate;
            this.swimlaneNoHeaderTemplate = "project.agile.kanban_table.swimlane";
            this.swimlaneTemplate = "project.agile.kanban_table.swimlane.collapsible";
            this.columnTemplate = "project.agile.kanban_table.column";
        }

        /**
         * Returns concrete value or promise which resolves string/number/undefined that will be used as a group ID for custom grouping of cards in swimlanes.
         */
        mapper(card) {
            if (this.field === undefined) {
                return undefined;
            } else {
                return getFieldId(card, this.field);
            }
        }

        compare(x, y) {
            return x === undefined || x === false ? 1 : y === undefined || y === false? -1 : x - y;
        }

        /**
         * Returns promise which resolves a dictionary that will be passed to qweb.render - headerTemplate
         * If no swimlane is selected, it should return undefined
         * @param card
         * @returns {Object}
         */
        header(card) {
            function pluralizedCount() {
                let count = this.recordCount();
                return count + " " + pluralize('issue', count);
            }

            if (this.field === undefined) {
                return undefined;
            } else if (!card[this.field]) {
                return {
                    headerData: {name: this.undefinedHeaderName},
                    pluralizedCount,
                    afterRender() {
                    }
                };
            } else {
                return {
                    headerData: {name: getFieldName(card, this.field)},
                    pluralizedCount,
                    afterRender() {
                    }
                };
            }
        }

        /**
         * Returns concrete value or promise which resolves boolean wether card should be rendered on table or not.
         * @param card
         * @returns {boolean}
         */
        filter(card) {
            return true;
        }

        /**
         * Should be called before any other method.
         * Initializes arrays/maps/etc. of promises used to enable bulk fetching.
         */
        begin() {
            return this;
        }

        /**
         * Should be called when mapper function has been called for all records
         * Purpose of this method is to create a batch request for all records external dependencies.
         * Since base SwimlaneDefinition doesn't return any promises, nothing has to be resolved.
         * References to temporary promises, etc. should be deleted so that GC can clean them up
         */
        resolve() {
            return this;
        }
    }

    class AsyncSwimlaneDefinition extends SwimlaneDefinition {
        mapper(card) {
            if (this.state !== "in_transaction") {
                throw new Error("SwimlaneDefinition mapper called without call to begin method");
            }
        }

        filter(card) {
            if (this.state !== "in_transaction") {
                throw new Error("SwimlaneDefinition filter called without call to begin method");
            }
            return super.filter(card);
        }

        begin() {
            this.state = "in_transaction";
            return this;
        }

        resolve() {
            this.state = "resolved";
            return this;
        }
    }

    class StorySwimlaneDefinition extends AsyncSwimlaneDefinition {
        constructor(kanbanTable) {
            super(kanbanTable, 'story', _("User Story"), _t("Other issues"), "project.agile.kanban_table.swimlane.header.story");
        }

        begin() {
            super.begin();
            this.parent_ids = [];
            this.parentDeferredMap = {};
            return this;
        }

        _getParentPromise(id) {
            if (!this.parentDeferredMap[id])
                this.parentDeferredMap[id] = new $.Deferred();
            this.parent_ids.includes(id) || this.parent_ids.push(id);
            return this.parentDeferredMap[id].promise();
        }

        mapper(task) {
            super.mapper(task);
            if (!task.parent_id) {
                return undefined;
            }
            let parentPromise = this._getParentPromise(task.parent_id[0]);
            return parentPromise.then(parentTask => {
                return parentTask.is_user_story ? parentTask.id : undefined;
            });
        }

        filter(task) {
            // Don't render user stories that are already shown as a swimlane
            return !(task.is_user_story && task.child_ids.find(t => this.kanbanTable.data.ids.includes(t)) ? true : false);
        }

        header(task) {
            if (!task.parent_id) {
                let header = super.header(task);
                header.headerData.name = this.undefinedHeaderName;
                header._overrideTemplate = "project.agile.kanban_table.swimlane.header.simple";
                return header;
            }
            return this._getParentPromise(task.parent_id[0]).then(task => {
                return {

                    task,
                    count() {
                        let count = this.recordCount();
                        return count + " " + pluralize('sub-task', count);
                    },
                    afterRender: element => {
                        element.find(".task-key").click(() => {
                            this.kanbanTable.trigger_up("open_task", {id: task.id});
                        })

                    }

                };
            });
        }

        resolve() {
            super.resolve();
            this.kanbanTable.loadRecords(this.parent_ids).then(records => {
                for (let record of records) {
                    this.parentDeferredMap[record.id].resolve(record);
                }
            });
            return this;
        }
    }

    var AbstractCard = BaseWidgets.AgileBaseWidget.extend({
        _name: "AbstractCard",
        template: "project.agile.kanban_table.card",
        customCardTitle: undefined,
        customCardFooter: undefined,
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            this._require_obj("record", ["id"])
        },
        renderElement() {
            this._super();
            this.customCardTitle && this.$(".card-title").append(qweb.render(this.customCardTitle, {widget: this}));
            this.customCardFooter && this.$(".footer-content").append(qweb.render(this.customCardFooter, {widget: this}));
        },
        start() {
            this._is_added_to_DOM.then(() => {
                this.$('.dropdown-button').dropdown();
                this.$('.tooltipped').tooltip();
            });
            for (let item of this.menuItems) {
                let callback = typeof item.callback == "function" ? item.callback : this[item.callback];
                if (typeof callback !== "function") {
                    throw new Error("menuItem.callback must be function or name of method from Card object");
                }
                this.$(`.${item.class}`).click(callback.bind(this));
            }
            return this._super();
        },
        image_url() {
            return false;
        },
        image_tooltip() {
            return false;
        },
        index() {
            return this.$el.index();
        }
    });
    var TaskCard = AbstractCard.extend({
        menuItems: [
            {class: "assign-to-me", icon: "mdi-account-check", text: _("Assign To Me"), callback: '_onAssignToMeClick'},
            {class: "edit-item", icon: "mdi-pencil", text: _("Edit"), callback: '_onEditItemClick'},
            {class: "add-sub-item", icon: "mdi-subdirectory-arrow-right", text: _("Add Sub Item"), callback: '_onAddSubItemClick'},
            {class: "add-link", icon: "mdi-link", text: _("Add Link"), callback: '_onAddLinkClick'},
            {class: "work-log", icon: "mdi-worker", text: _("Log Work"), callback: '_onWorkLogClick'},
            {class: "add-comment", icon: "mdi-comment-account", text: _("Add Comment"), callback: '_onAddCommentClick'},
        ],
        customCardTitle: "project.agile.kanban_table.card.task.title",
        customCardFooter: "project.agile.kanban_table.card.task.footer",
        init(parent, options) {
            this._super(parent, options);
            this.task = this.record;
        },
        willStart() {
            return this._super().then(() => {
                return $.when(data.cache.get("current_user").then(user => data.cache.get("team_members", {teamId: user.team_id[0]})).then(members => {
                    this.user = members.find(e => this.task.user_id && e.id == this.task.user_id[0]);
                }), DataServiceFactory.get("project.task.type2").getRecord(this.task.type_id[0]).then(task_type => {
                    this.task_type = task_type;
                }))
            });
        },
        start() {
            this.$(".task-key").click(() => {
                this.trigger_up("open_task", {id: this.task.id});
            });
            if (this.user && this.task.user_id[0] == data.session.uid) {
                this.$(".assign-to-me").hide();
            }
            this.task_type.allow_sub_tasks || this.$(".add-sub-item").hide();
            return this._super();
        },
        image_url() {
            return this.user ? data.getImage("res.users", this.user.id, this.user.write_date) : "/project_agile/static/img/unassigned.png";
        },
        image_tooltip() {
            return this.user ? this.user.name : _t("Unassigned");
        },
        _onWorkLogClick() {
            var modal = new AgileModals.WorkLogModal(this.getParent(), {
                task: this.task,
                userId: data.session.uid,
                afterHook: workLog => {
                    this.trigger_up("add_worklog", {taskId: this.task.id, workLog});
                }
            });
            modal.appendTo($("body"));
        },
        _onAddLinkClick() {
            var modal = new AgileModals.LinkItemModal(this.getParent(), {
                task: this.task,
                afterHook: (link) => {
                    this.trigger_up("add_link", {taskId: this.task.id, link});
                }
            });
            modal.appendTo($("body"));
        },
        _onAddCommentClick() {
            var modal = new AgileModals.CommentItemModal(this.getParent(), {
                task: this.task,
                afterHook: (comment) => {
                    this.trigger_up("add_comment", {taskId: this.task.id, comment});
                }
            });
            modal.appendTo($("body"));
        },
        _onAddSubItemClick() {
            var newItemModal = new AgileModals.NewItemModal(this.getParent(), {
                currentProjectId: this.task.project_id[0],
                parent_id: this.task.id,
                afterHook: taskId => {
                    task_service.getRecord(taskId).then(task => {
                        this.trigger_up("add_subtask", {taskId: this.task.id, task});
                    });
                }
            });
            newItemModal.appendTo($("body"));
        },
        _onEditItemClick() {
            let newItemModal = new AgileModals.NewItemModal(this.getParent(), {
                currentProjectId: this.task.project_id[0],
                edit: this.task,
            });
            newItemModal.appendTo($("body"));
        },
        _onAssignToMeClick() {
            this.task.user_id = data.session.uid;
            // data.cache.get("current_user").then(user => {
            //     this.user = user;
            //     this.renderElement();
            //     this.start();
            // });
        },

    });

    var AbstractKanbanTable = BaseWidgets.AgileBaseWidget.extend({
        _name: "KanbanTable",
        template: "project.agile.kanban_table",
        kanbanTableOptionsID: undefined,
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            this.swimlanes = this.initSwimlaneDefinitions();
            this._require_prop("swimlanes", "This property specifies fields used to group cards in swimlanes. " +
                "Fields are stored in ES6 Map." +
                "Key is field name, value is instance of SwimlaneDefinition ES6 class");
            this._require_prop("dataService", "An instance of implementation of DataService from project_agile.DataService module.");
            this._require_prop("stageField", "This property tells table what is the field of card model that workflow is wrapped around.");
            this._require_prop("kanbanTableOptionsID", "This property is used to identify key of options object in local storage");
            /**
             * This method should be overridden in concrete implementation
             * Here we have demo structure that shows what loadData should resolve
             {
                board: {
                    name: "Development",
                    columns: {
                        "1": {order: 1, id: 1, name: "To Do"},
                        "2": {order: 2, id: 2, name: "In Progress"},
                        "3": {order: 3, id: 3, name: "Done"},
                    },
                    // state_id is link to project.workflow.state
                    status: {
                        "1": {state_id: 72, "column_id": 1, "id": 1, "order": 2},
                        "2": {state_id: 66, "column_id": 1, "id": 2, "order": 1},
                        "3": {state_id: 67, "column_id": 2, "id": 3, "order": 0},
                        "4": {state_id: 68, "column_id": 3, "id": 4, "order": 0}
                    },
                },
                workflow: {
                    workflows: {
                        1: {id: 1, name: "Workflow 1", description: "Workflow 1 description"},
                        2: {id: 2, name: "Workflow 2", description: "Workflow 2 description"},
                        3: {id: 3, name: "Workflow 3", description: "Workflow 3 description"},
                    }
                    states: {
                        66: {
                            id: 66,
                            stage_id: 4, // This will has to be defined when creating KanbanTable (stageField)
                            global_in: true,
                            global_out: false,
                            name: "To Do",
                            type: "todo",
                            workflow_id: 1,
                            in_transitions: [],
                            out_transitions: [91],
                        },
                        67: {
                            id: 67,
                            stage_id: 14,
                            global_in: false,
                            global_out: false,
                            name: "In Progress",
                            type: "in_progress",
                            workflow_id: 1,
                            in_transitions: [91, 97],
                            out_transitions: [92, 95]
                        },
                        ...
                    }
                    transitions: {
                        1: {
                            id: 1,
                            name: "Start progress",
                            description: "Begin working on task",
                            src: 66,
                            dst: 67,
                            workflow_id: 1,
                            user_confirmation: true,
                        },
                        ...
                    }
                }
                ids: [1,2,3,4,5]
             }
             */
            this._require_obj("data", ['board', 'workflow', 'ids'], "Check code comments for propper format of data");
            this._require_obj("Card", ["Card"], "Card object with Card property must point to concrete implementation of AbstractCard class.");

            this.records = [];

            //Keeping track of card widgets
            this.cardWidgetsMap = new Map();

            // Load current board options from storage service
            this.kanbanOptions = storage_service.get("kto" + this.kanbanTableOptionsID) || {};
            this.swimlane = this.swimlane || this.kanbanOptions.swimlane;

        },
        /**
         * Override this method in order to append more swimlane options
         * @returns {Map}
         */
        initSwimlaneDefinitions() {
            return new Map([
                [undefined, new SwimlaneDefinition(this, undefined, _("No swimlanes"))],
            ])
        },
        willStart() {
            // Only user result is needed to be assigned to widget.
            return $.when(data.cache.get("current_user"), this._super.apply(arguments), this.loadRecords(this.data.ids)).then(user => {
                    this.current_user = user;
                    this.prepareData();
                    return this.prepareSwimlaneData();
                }
            )
        },
        /**
         * Wraps dataService.getRecords and saves records in cache for later synchronous use.
         * @param ids
         */
        loadRecords(ids) {
            return this.dataService.getRecords(ids).then(records => {
                this.records.push.apply(this.records, records);
                return records;
            });
        },
        /**
         * Wraps dataService.getRecord and saves record in cache for later synchronous use.
         * @param id
         */
        loadRecord(id) {
            return this.dataService.getRecord(id).then(record => {
                this.records.push(record);
                return record;
            });
        },
        prepareData() {
            // Create columns array and sort it by column order
            let columns_map = this.data.board.columns;
            this.data.sorted_columns = Object.keys(columns_map).map(key => columns_map[key]).sort((a, b) => a.order - b.order);
            this.states = {};
            this.data.board.stateToStatus = {};
            this.data.workflow.global_states = {
                in: [],
                out: []
            };
            // Assign every state to a column in sorted_columns, map state to status and save global states
            for (let status_id in this.data.board.status) {
                let status = this.data.board.status[status_id];
                let state = this.data.workflow.states[status.state_id];
                let column = this.data.sorted_columns.find(col => {
                    return status.column_id == col.id;
                });

                state.global_in && this.data.workflow.global_states.in.push(state);
                state.global_out && this.data.workflow.global_states.out.push(state);

                this.data.board.stateToStatus[state.id] = status;

                // Push state to column.states and create array if it didn't exist before.
                (column.status = column.status || []).push(status);
                this.states[state.id] = state;
            }
        },
        renderElement() {
            this._super();
            this.$(".column-headers").append(this.renderHeaders());
            this.renderSwimlanes(this.$(".swimlanes"));
        },
        prepareSwimlaneData() {
            let swimlaneDefinition = this.swimlanes.get(this.swimlane).begin();
            this.data.swimlanes = new Map();

            let promises = [];

            function recordCount() {
                return this.records.length;
            };
            for (let record_id of this.data.ids) {
                let record = this.records.find(r => r.id === record_id);
                promises.push($.when(swimlaneDefinition.mapper(record), swimlaneDefinition.filter(record)).then((group, passIt) => {
                    if (passIt) {
                        if (this.data.swimlanes.has(group)) {
                            this.data.swimlanes.get(group).records.push(record);
                        }
                        else {
                            let swimlaneData = {records: [record]};
                            this.data.swimlanes.set(group, swimlaneData);
                            return $.when(swimlaneDefinition.header(record)).then(header => {
                                if (header) {
                                    header.recordCount = recordCount.bind(swimlaneData);
                                }
                                swimlaneData.header = header;
                            })
                        }
                    }
                }));
            }
            swimlaneDefinition.resolve();
            return $.when(...promises);
        },
        getActiveSwimlane() {
            return this.swimlanes.get(this.swimlane);
        },
        renderHeaders() {
            let result = [];
            for (let column of this.data.sorted_columns) {
                result.push((`<li class="column" data-id="${column.id}">${column.name}</li>`))
            }
            return result;
        },
        renderSwimlanes(placeholder) {
            let result = [];
            if (this.data.swimlanes.size < 1) {
                return;
            } else if (this.data.swimlanes.size === 1 && [...this.data.swimlanes.keys()][0] === undefined) {
                this.data.swimlanes.forEach((data, id) => {
                    result.push(this.renderSwimlane(data, id, false, placeholder));
                });
            } else {
                let swimlaneDefinition = this.swimlanes.get(this.swimlane)

                // let sortedSwimlanes = [...this.data.swimlanes.keys()].sort((a, b) => !a ? 1 : -1);
                let sortedSwimlanes = [...this.data.swimlanes.keys()].sort(swimlaneDefinition.compare);
                sortedSwimlanes.forEach(id => {
                    let data = this.data.swimlanes.get(id);
                    result.push(this.renderSwimlane(data, id, true, placeholder));
                });
            }
            return result;
        },
        renderSwimlane(data, id, renderHeader = true, placeholder) {
            let node;
            let swimlaneDefinition = this.swimlanes.get(this.swimlane);

            if (!renderHeader) { // No swimlane
                node = $(qweb.render(swimlaneDefinition.swimlaneNoHeaderTemplate).trim());
            } else { // If swimlane has header, render collapsibles

                node = $(qweb.render(swimlaneDefinition.swimlaneTemplate).trim());
                let headerTemplate = data.header._overrideTemplate || swimlaneDefinition.headerTemplate;
                let header = $(qweb.render(headerTemplate, data.header).trim());
                node.find(".collapsible-header").append(header);
                data.header.afterRender(header);
            }

            node.attr("data-swimlane-id", id);

            placeholder.append(node);

            // prepare records for columns and render them
            let recordsByStageFieldId = new Map();
            data.records.forEach(record => {
                let recordStageFieldId = this.getStageFieldId(record);
                recordsByStageFieldId.has(recordStageFieldId) ?
                    recordsByStageFieldId.get(recordStageFieldId).push(record) :
                    recordsByStageFieldId.set(recordStageFieldId, [record]);
            });


            for (let column of this.data.sorted_columns) {
                let column_cards = [];
                recordsByStageFieldId.forEach((records, stageFieldId) => {
                    // Check if card belongs to column by checking if some status has workflow.state that wraps around records stageFieldId
                    if (column.status && column.status.some(e => this.data.workflow.states[e.state_id].stage_id == stageFieldId)) {
                        column_cards.push(...records);
                    }
                });
                this.renderColumn(column, column_cards, node.find(".columns"));
            }
            return node;
        },
        renderColumn(column, records, placeholder) {
            let swimlaneDefinition = this.swimlanes.get(this.swimlane);
            let node = $(qweb.render(swimlaneDefinition.columnTemplate, column));
            placeholder.append(node);
            let sorted_records = records.sort((a, b) => a.agile_order - b.agile_order);
            for (let record of sorted_records) {
                let cardWidget = this.renderCard(record);
                cardWidget.appendTo(node);
            }

            var tableThis = this;
            node.sortable({
                start: function (event, ui) {
                    var cardNode = $(ui.helper);
                    let swimlaneId = cardNode.getDataFromAncestor("swimlane-id", ".swimlane");
                    let columnId = cardNode.getDataFromAncestor("column-id");
                    let cardId = cardNode.getDataFromAncestor("card-id");

                    this.swimlaneNode = swimlaneId === undefined ?
                        tableThis.$(`.swimlane:not([data-swimlane-id])`) :
                        tableThis.$(`.swimlane[data-swimlane-id=${swimlaneId}]`);

                    let preventStopEvent = this.preventStopEvent;
                    // Generate overlays over all other columns except the source column
                    for (let columnNode of $.makeArray(this.swimlaneNode.find(`.column:not([data-column-id=${columnId}])`))) {
                        columnNode = $(columnNode);
                        let columnNodeId = columnNode.data("column-id");
                        let columnOverlay = tableThis.generateOverlay(columnNodeId, cardId);

                        // Attach event on drop on each of overlay states
                        columnOverlay.find(".state").on("drop", (event, ui) => {
                            let cardNode = $(ui.helper);
                            let cardId = cardNode.data("card-id");
                            let targetDataset = event.target.dataset;
                            let newState = tableThis.data.workflow.states[targetDataset["stateId"]];
                            let newStatus = tableThis.data.board.stateToStatus[newState.id];
                            let isTransitionGlobal = targetDataset["transitionId"] === "global";
                            let transition = tableThis.data.workflow.transitions[targetDataset["transitionId"]];

                            // get cardWidget from table
                            let cardWidget = tableThis.cardWidgetsMap.get(cardId);

                            var changeRecordStage = function (message) {
                                // Set new stageField
                                let cardWidget = tableThis.cardWidgetsMap.get(cardId);

                                //record._source[tableThis.stageField] = parseInt(newState.stage_id);
                                cardWidget.record._source[tableThis.stageField] = parseInt(newState.stage_id);

                                let swimlaneId = cardWidget.$el.getDataFromAncestor("swimlane-id", ".swimlane");
                                let columnId = newStatus.column_id;
                                let swimlaneNode = swimlaneId === undefined ?
                                    tableThis.$(`.swimlane:not([data-swimlane-id])`) :
                                    tableThis.$(`.swimlane[data-swimlane-id=${swimlaneId}]`);
                                let columnNode = swimlaneNode.find(`.column[data-column-id=${columnId}]`);

                                cardWidget.appendTo(columnNode);

                                if (tableThis.rightSideWidget && !this.rightSideWidget.isDestroyed() && tableThis.rightSideWidget.id == cardWidget.id) {
                                    tableThis.rightSideWidget.setState(newState, false);
                                    if (message) {
                                        tableThis.rightSideWidget.addComment(message);
                                    }
                                }
                            };
                            if (!isTransitionGlobal && transition.user_confirmation) {
                                console.log("Need confirmation");
                                tableThis.openStageChangeModal(newState.stage_id, cardWidget, changeRecordStage);
                            } else {
                                changeRecordStage();
                            }

                            // Set property of sortable so that sorting within column is not mixed with changing column.
                            preventStopEvent = true;
                        });
                        columnOverlay.appendTo(columnNode);
                    }
                    console.log(swimlaneId, columnId, cardId);
                },
                stop: function (event, ui) {
                    console.log("removing overlays");
                    this.swimlaneNode.find(".column-overlay").remove();

                    if (this.preventStopEvent) {
                        delete this.preventStopEvent;
                        return;
                    }
                    console.log(event);
                }
            });
            return node;
        },
        renderCard(record) {
            if (this.cardWidgetsMap.has(record.id)) {
                return this.cardWidgetsMap.get(record.id);
            }
            let cardWidget = new this.Card.Card(this, {record});
            this.cardWidgetsMap.set(record.id, cardWidget);
            return cardWidget;

        },
        getStageFieldId(record) {
            return getFieldId(record, this.stageField);
        },
        getStageFieldName(record) {
            return getFieldName(record, this.stageField);
        },
        getWorkflowState(stageFieldId, workflow_id) {
            for (let state_id in this.data.workflow.states) {
                let state = this.data.workflow.states[state_id];
                if (state.workflow_id === workflow_id && state[this.stageField] === stageFieldId) {
                    return state;
                }
            }
        },
        getColumnFromStageField(stageFieldId) {
            for (let column of this.data.sorted_columns) {
                for (let status of column.status) {
                    if (this.data.workflow.states[status.state_id].stage_id === stageFieldId) {
                        return column;
                    }
                }
            }
        },
        generateOverlay: function (columnId, recordId) {
            let record = this.records.find(r => r.id === recordId);
            let stageFieldId = this.getStageFieldId(record);

            let currentState = this.getWorkflowState(stageFieldId, record.workflow_id[0]);
            let availableTransitions = this.getAvailableTransitions(currentState, this.data.workflow, record);

            var overlay = $(`<div class="column-overlay" data-column-id="${columnId}"></div>`);

            if (this.data.board.columns[columnId].status) {
                for (let status of this.data.board.columns[columnId].status) {
                    let state = this.data.workflow.states[status.state_id];
                    let transition = availableTransitions.find(t => t.dst == state.id);
                    if (transition) {
                        let stateNode = $(`<div class="state agile-main-color lighten-5" data-state-id="${state.id}" data-transition-id="${transition.id}">${state.name}</div>`);
                        stateNode.droppable({
                            classes: {"ui-droppable-hover": "hover"},
                        });
                        stateNode.appendTo(overlay);
                    }
                }
            }
            return overlay;
        },
        getAvailableTransitions(currentState, workflow) {
            // Duplicate transitions won't be rendered multiple times, so don't worry
            // This case can happen, if there is in/out transition and state is global in/our
            let transitions = currentState.out_transitions.map(t_id => workflow.transitions[t_id]);
            if (currentState.global_out) {
                for (let state_id in workflow.states) {
                    let state = workflow.states[state_id];
                    if (state.id !== currentState.id) {
                        transitions.push(this.generateFakeTransition(workflow, currentState, state));
                    }
                }
            } else {
                workflow.global_states.in.filter(e => e.id != currentState.id).forEach(state => {
                    transitions.push(this.generateFakeTransition(workflow, currentState, state));
                });
            }
            console.log(transitions);
            return transitions;
        },
        generateFakeTransition(workflow, src, dst) {
            return {
                description: "",
                dst: dst.id,
                id: "global",
                name: dst.name,
                src: src.id,
                user_confirmation: false,
                workflow_id: workflow.id
            }
        },
        openStageChangeModal(newStageId, cardWidget, confirmedCallback) {
            let state = this.getWorkflowState(newStageId, cardWidget.record.workflow_id[0]);
            var modal = new AgileModals.TaskStageConfirmationModal(this, {
                taskId: cardWidget.record.id,
                stageId: newStageId,
                stageName: state.name,
                userName: cardWidget.record.user_id ? cardWidget.record.user_id[1] : _("Unassigned"),
                afterHook: (confirmation, form, result) => {
                    confirmedCallback(result);
                }
            });
            modal.appendTo($("body"));
        },
        getCard(id) {
            return this.cardWidgetsMap.get(id);
        },
        addCard(id, syncerMeta, highlight = true) {
            return this._doAddCard(id, syncerMeta, highlight, INDEX_NOT_FOUND);
        },

        insertCardAt(id, index, syncerMeta, highlight = true) {
            return this._doAddCard(id, syncerMeta, highlight, index);
        },
        shouldCardBeAdded(record) {
            return true;
        },
        _doAddCard(id, syncerMeta, highlight, index) {
            return this.dataService.getRecord(id).then(record => {
                if (record && this.shouldCardBeAdded(record)) {
                    let swimlaneDefinition = this.swimlanes.get(this.swimlane).begin();
                    let def = $.when(swimlaneDefinition.mapper(record), swimlaneDefinition.filter(record)).then((group, passIt) => {
                        if (passIt) {
                            if (this.data.swimlanes.has(group)) {
                                this.data.swimlanes.get(group).records.push(record);
                                let column = this.getColumnFromStageField(this.getStageFieldId(record));
                                if (!column) {
                                    return;
                                }
                                var node = group === undefined ?
                                    this.$(`.swimlane:not([data-swimlane-id]) ${" "} div[data-column-id="${column.id}"]`) :
                                    this.$(`.swimlane[data-swimlane-id=${group}] ${" "} div[data-column-id="${column.id}"]`);
                                let cardWidget = this.renderCard(record);

                                if (index > INDEX_NOT_FOUND) {
                                    cardWidget.insertAt(node, index);
                                } else {
                                    cardWidget.appendTo(node);
                                }
                                let swimlaneNode = group === undefined ?
                                    this.$('.swimlane:not([data-swimlane-id])') :
                                    this.$(`.swimlane[data-swimlane-id=${group}]`);
                                let count = this.data.swimlanes.get(group).records.length;
                                swimlaneNode.find(".swimlane-header .count").text(count + " " + pluralize('issue', count));

                                if (syncerMeta.indirect === false) {
                                    cardWidget._is_added_to_DOM.then(() => {
                                        node.scrollToElement(cardWidget.$el);
                                        highlight && cardWidget.$el.highlight();
                                    });
                                }
                            }
                            else {  // If destination swimlane doesn't exist then render it with new card and append in view
                                let swimlaneData = {records: [record]};
                                this.data.swimlanes.set(group, swimlaneData);

                                let recordCount = function () {
                                    return this.records.length;
                                };
                                return $.when(swimlaneDefinition.header(record)).then(header => {
                                    if (header) {
                                        header.recordCount = recordCount.bind(swimlaneData);
                                    }
                                    swimlaneData.header = header;
                                    // If last swimlane is undefined, then insert new swimlane before it, otherwize insert swimlane after it.
                                    let lastSwimlane = this.$(".swimlane").last();
                                    let newSwimlaneNode = this.renderSwimlane(swimlaneData, group, !!header, lastSwimlane);
                                    if (lastSwimlane.data("swimlane-id") !== undefined) {

                                        let sortedSwimlanes = [...this.data.swimlanes.keys()].sort(swimlaneDefinition.compare);
                                        let index = sortedSwimlanes.indexOf(group)

                                        this.$(".swimlanes").insertAt(newSwimlaneNode, index);
                                        //newSwimlaneNode.insertAfter(lastSwimlane);
                                    } else {
                                        newSwimlaneNode.insertBefore(lastSwimlane)
                                    }
                                    // Enable collapsing in new swimlane
                                    newSwimlaneNode.find('.collapsible').collapsible();
                                    if (this.rightSideWidget && !this.rightSideWidget.isDestroyed() && this.rightSideWidget.id == task.parent_id[0]) {
                                        this.rightSideWidget.addSubTask(task);
                                    }
                                })
                            }
                            if (syncerMeta) {
                                if (syncerMeta.user_id.id !== data.session.uid && syncerMeta.indirect === false) {
                                    AgileToast.toastTask(syncerMeta.user_id, record, syncerMeta.method);
                                }
                            }
                        }
                    });
                    swimlaneDefinition.resolve();
                    return def;
                }
            });

        },
        removeCard(id, removeFromCache = false, syncerMeta) {
            let cardWidget = this.cardWidgetsMap.get(id);
            if (!cardWidget) {
                return false;
            }
            if (removeFromCache) {
                let swimlaneDefinition = this.swimlanes.get(this.swimlane).begin();
                let previousMapped = cardWidget.record._previous ? swimlaneDefinition.mapper(cardWidget.record._previous) : null;
                $.when(previousMapped, swimlaneDefinition.mapper(cardWidget.record), swimlaneDefinition.filter(cardWidget.record)).then((previousGroup, group, passIt) => {
                    if (previousGroup !== null) {
                        let swimlaneData = this.data.swimlanes.get(previousGroup);
                        swimlaneData.records = swimlaneData.records.filter(e => e.id !== cardWidget.record.id);
                        let swimlaneNode = previousGroup === undefined ?
                            this.$('.swimlane:not([data-swimlane-id])') :
                            this.$(`.swimlane[data-swimlane-id=${previousGroup}]`);
                        if (swimlaneData.records.length === 0) {
                            this.data.swimlanes.delete(previousGroup);
                            swimlaneNode.remove();
                        } else {
                            let count = swimlaneData.records.length;
                            swimlaneNode.find(".swimlane-header .count").text(count + " " + pluralize('issue', count));
                        }
                    }
                });

                cardWidget.destroy();
                this.cardWidgetsMap.delete(id)
            } else {
                cardWidget.$el.detach();
            }
            if (syncerMeta) {
                if (syncerMeta.user_id.id !== data.session.uid && syncerMeta.indirect === false) {
                    AgileToast.toastTask(syncerMeta.user_id, syncerMeta.data, syncerMeta.method);
                }
            }
        },
        /**
         * This method should return [project.workflow.state].id.
         * Usually from <model>[this.stageField] and workflow,
         * but if there is related field on model, it can be returned also.
         *
         * @param {number} id - ID of record under the card.
         */
        getCardState(id) {
            throw new Error("Not implemented");
        },
        resolveCardIndex(card, delta) {
            return INDEX_NOT_FOUND;
        },
        setSwimlane(name, store = true) {
            this.kanbanOptions.swimlane = name;
            store && storage_service.set("kto" + this.kanbanTableOptionsID, this.kanbanOptions);
            this.prepareSwimlaneData().then(() => {
                this.$(".swimlanes").empty();
                this.renderSwimlanes(this.$(".swimlanes"));
                this.$('.collapsible').collapsible();
            });
        },
        addedToDOM() {
            this.$('.collapsible').collapsible();
        }
    });
    var TaskTable = AbstractKanbanTable.extend({
        Card: {Card: TaskCard},
        init(parent, options) {
            this._super(parent, options);
            if (!Array.isArray(this.data.board.task_types)) {
                throw new Error("TaskTable requires board to define task_type as Array");
            }


        },
        custom_events: {
            add_subtask: function (evt) {
                this.addCard(evt.data.task);
            },
        },
        initSwimlaneDefinitions() {
            let defs = this._super();
            defs.set('user_id', new SwimlaneDefinition(this, 'user_id', _("Assignee"), _t("Unassigned")));
            defs.set('priority_id', new SwimlaneDefinition(this, 'priority_id', _("Priority"), _t("Without priority")));
            defs.set('project_id', new SwimlaneDefinition(this, 'project_id', _("Project"), _t("Without project")));
            defs.set('epic_id', new SwimlaneDefinition(this, 'epic_id', _("Epic"), _t("Without epic")));
            defs.set('story', new StorySwimlaneDefinition(this));
            return defs;
        },
        dataService: task_service,
        stageField: "stage_id",

        prepareData() {
            this._super();
            this.board_project_ids = Object.keys(this.data.board.projects).map(k => parseInt(k));
        },

        getCardState(id) {
            return this.cardWidgetsMap.get(id).task.wkf_state_id;
        },
        shouldCardBeAdded(task) {

            // Filter tasks by project filters
            let team_project_ids = this.current_user.team_ids[this.current_user.team_id[0]].project_ids;
            let hash_project_id = parseInt(hash_service.get("project"));
            let task_project_id = task.project_id[0];

            if (hash_project_id && task_project_id !== hash_project_id) return false;
            if (!team_project_ids.includes(task_project_id)) return false;
            if (!this.board_project_ids.includes(task_project_id)) return false;

            // Filter task by task_types filter
            if (this.data.board.task_types.length && !this.data.board.task_types.includes(task.type_id[0])) return false;

            // todo Map task (stage_id, workflow_id) to Wkf State and then check if the state is mapped to any of the columns in the board
            // todo Check if stage_id is in this.data.workflow.states (but create stageToState map when loading)

            return true;
        },
        resolveCardIndex(id, delta) {
            let card = this.cardWidgetsMap.get(id);
            if (!card) return INDEX_NOT_FOUND;

            let swimlane = this.getActiveSwimlane();
            let swimlane_field = swimlane.field === undefined ? false :
                swimlane.field === 'story' ? 'parent_id' : swimlane.field;

            let isUpdated = function (fieldName) {
                if (!(fieldName in delta)) return false;
                let left = getFieldId(delta[fieldName]);
                let right = fieldName in card.record._previous ? getFieldId(card.record._previous[fieldName]) : false;
                return left != right;
            }.bind(this);

            let isUpdatedStageField = function () {
                return isUpdated(this.stageField);
            }.bind(this);


            // When there is no swimlane we need to see if the stage is updated
            if (swimlane_field === undefined)
                return isUpdatedStageField();

            // Check if the current swimlane field is updated
            if (isUpdated(swimlane.field))
                return INDEX_NOT_FOUND;

            if (isUpdatedStageField())
                return INDEX_NOT_FOUND;

            return card.index();
        },
    });

    var AbstractKanbanTableView = BaseWidgets.AgileViewWidget.extend({
        _name: "KanbanTableView",
        template: "project.agile.view.kanban_table",
        emptyTitle: _("No data in kanban table"),
        emptyTemplate: "project.agile.view.kanban_table.empty",
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            // Because of core.Class implementation wraps functions, we  will have to wrap KanbanTable class in an object.
            this._require_obj("KanbanTable", ["KanbanTable"], "KanbanTable object with KanbanTable property must point to concrete implementation of AbstractKanbanTable class.");
        },
        openSettings() {
            // Set form fields.
            if (this.kanbanTable.swimlane) {
                this.$("#modal-settings select").val(this.kanbanTable.swimlane).material_select();
            }
            let modalNode = this.$("#modal-settings");
            modalNode.materialModal("open");
        },
        destroy() {
            this._super();
            // Not sure if this is needed anymore
            // TODO: Check why is this here...
            if ($(".lean-overlay").size()) {
                $(".lean-overlay").remove();
            }
        },
        isEmpty() {
            throw new Error("Not implemented");
        },
        getTitle() {
            console.warn("This should be overridden in concrete implementation");
            return _("Kanban table");
        },
        willStart() {
            return this._super().then(data.cache.get("current_user").then(user => {
                this.user = user;
            }));
        },
        renderElement() {
            // Handling case when there is no data, and empty template should be rendered
            if (this.isEmpty()) {
                this.setTitle(this.emptyTitle);
            }
            this._super();
            if (!this.isEmpty()) {
                this.kanbanTable = new this.KanbanTable.KanbanTable(this, this.generateKanbanTableOptions());

                // Render settings modal
                this.$("#kanban-table-view").append(this.renderSettingsModal());
                this.kanbanTable.appendTo(this.$("#kanban-table-view"));
                this.setTitle(this.getTitle());

                // Set action menu
                this.trigger_up("init_action_menu", this.getActionMenu());
            }
            //this.$el.append(JSON.stringify(this.data));
        },
        generateKanbanTableOptions() {
            return {data: this.data};
        },
        renderSettingsModal() {
            let swimlanes = [];
            for (let [key, obj] of this.kanbanTable.swimlanes.entries()) {
                swimlanes.push({value: key, text: obj.text});
            }
            return qweb.render("project.agile.view.kanban_table.settings_modal", {swimlanes});
        },
        _getSwimlaneOptions() {
            return this.kanbanTable.swimlanes
        },
        getActionMenu() {
            return {
                items: [
                    {icon: "settings", action: this.openSettings.bind(this)}
                ]
            }
        },
        start() {
            this._is_added_to_DOM.then(() => {
                this.$('select').material_select();
                //this.$('.section').perfectScrollbar({suppressScrollY: true});
            });

            let modalNode = this.$("#modal-settings");
            // On save button click check if form has been modified, and if so update options, and store them to storage_service
            this.$("#modal-settings .modal-save").click(evt => {
                if (this.kanbanTable.swimlane !== this.$("#modal-settings select :selected").attr("value")) {
                    this.kanbanTable.swimlane = this.$("#modal-settings select :selected").attr("value");
                    this.kanbanTable.setSwimlane(this.kanbanTable.swimlane);
                }
                modalNode.materialModal("close");
            });
            modalNode.materialModal();
            return this._super();
        }
    });
    var TaskKanbanTableView = AbstractKanbanTableView.extend({
        custom_events: Object.assign(AbstractKanbanTableView.prototype.custom_events, {
            open_task: "_onOpenTask",
            add_worklog: "_onAddWorklog",
            add_link: "_onAddLink",
            add_comment: "_onAddComment",
        }),
        _onOpenTask: function (evt) {
            this.trigger_up("open_right_side", {WidgetClass: TaskWidget, options: {id: evt.data.id, isQuickDetailView: true}});
        },
        _onAddWorklog: function (evt) {
            this._ifTaskOpen("addWorkLog", evt.data.taskId, evt.data.workLog);
        },
        _onAddLink: function (evt) {
            this._ifTaskOpen("addLink", evt.data.taskId, evt.data.link);
        },
        _onAddComment: function (evt) {
            this._ifTaskOpen("addComment", evt.data.taskId, evt.data.comment);
        },
        _ifTaskOpen(method, taskId) {
            if (this.rightSideWidget && !this.rightSideWidget.isDestroyed() && this.rightSideWidget.id == taskId) {
                if (typeof this.rightSideWidget[method] !== "function") {
                    throw new Error("Method doesn't exist on task");
                }
                this.rightSideWidget[method].apply(this.rightSideWidget, Array.prototype.slice.call(arguments, 2));
            }
        },
        addedToDOM() {
            core.bus.on("project.task:write", this, this._onProjectTaskWrite);
            core.bus.on("project.task:create", this, this._onProjectTaskCreate);
            core.bus.on("project.task:unlink", this, this._onProjectTaskUnlink);
            return this._super();
        },
        _onProjectTaskWrite(id, delta, payload, record) {
            let editPromise = record && record._edit("check") ? record._edit() : $.when();
            editPromise.then(() => {
                let cardIndex = this.kanbanTable.resolveCardIndex(id, delta);
                this.kanbanTable.removeCard(id, true);
                return this.kanbanTable.insertCardAt(id, cardIndex, payload).then(() => {
                    if (this.rightSideWidget && this.rightSideWidget.id === id) {
                        // Since trigger_up wraps event arguments in data object, here I mimic that behaviour.
                        this.trigger("open_right_side", {data: {WidgetClass: TaskWidget, options: {id, isQuickDetailView: true}}});
                    }
                });
            });
        },
        _onProjectTaskCreate(id, vals, payload) {
            this.kanbanTable.addCard(id, payload);
        },
        _onProjectTaskUnlink(id, payload) {
            this.kanbanTable.removeCard(id, true, payload);
            if (this.rightSideWidget && this.rightSideWidget.id === id) {
                this.rightSideWidget.destroy(true);
                delete this.rightSideWidget;
            }
        },
    });


    return {
        AbstractKanbanTableView,
        AbstractKanbanTable,
        AbstractCard,
        TaskCard,
        TaskKanbanTableView,
        TaskTable,
        SwimlaneDefinition,
        AsyncSwimlaneDefinition,
        StorySwimlaneDefinition,
    }
});