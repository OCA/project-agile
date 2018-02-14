// This script is meant to be used in browsers developer tools console. Set

let agile_order = 1;
let tasks_per_project = 5;
let subitem_probability = 0.5;
let subitem_count_min_max = [1, 5];
let sleep_timeout = 100;
data.getDataSet("project.project").read_slice(["id", "key"], {domain: [['agile_enabled', '=', true]]}).then(projects => {

    projects.forEach(project => {
        data.session.rpc(`/agile/web/data/project/${project.id}/task_types_and_priorities`)
            .then(types_and_priorities => {
                function randomType(type_ids) {
                    if (!Array.isArray(type_ids)) {
                        type_ids = types_and_priorities.project_types;
                    }
                    let randomIndex = Math.round(Math.random() * (type_ids.length - 1));
                    let type_id = type_ids[randomIndex];
                    return types_and_priorities.types[type_id];
                }

                function randomPriority(type) {
                    let randomIndex = Math.round(Math.random() * (type.priority_ids.length - 1));
                    let priority_id = type.priority_ids[randomIndex];
                    return types_and_priorities.priorities[priority_id];
                }

                for (let i = 1; i <= tasks_per_project; i++) {
                    let type = randomType();
                    let task = {
                        name: type.name + " " + project.key + i,
                        agile_order: agile_order++,
                        project_id: project.id,
                        priority_id: randomPriority(type).id,
                        story_points: type.allow_story_points ? Math.round(Math.random() * 10) + 1 : 0,
                        type_id: type.id
                    };
                    console.log(task);

                    // Being gentle to server;
                    function sleeperPromise(mils) {
                        let def = $.Deferred();
                        setTimeout(def.resolve, mils);
                        return def.promise();
                    }

                    let taskPromise = sleeperPromise(sleep_timeout * i).then(() => data.getDataSet("project.task").create(task, {context: {tracking_disable: false}}));
                    // Maybe create subitem
                    if (type.allow_sub_tasks && Math.random() < subitem_probability) {
                        // How much should we create?
                        let subitemCount = Math.round(Math.random() * (subitem_count_min_max[1] - subitem_count_min_max[0])) + subitem_count_min_max[0];
                        console.log(`Createing ${subitemCount} subitems`);
                        taskPromise.then(newTaskId => {
                            for (let j = 0; j < subitemCount; j++) {
                                let subitemsType = randomType(type.type_ids);
                                if(!subitemsType){
                                    continue;
                                }
                                let subItem = {
                                    parent_id: newTaskId,
                                    name: subitemsType.name + " " + project.key + i + j,
                                    agile_order: agile_order++,
                                    project_id: project.id,
                                    priority_id: randomPriority(subitemsType).id,
                                    story_points: subitemsType.allow_story_points ? Math.round(Math.random() * 10) + 1 : 0,
                                    type_id: subitemsType.id
                                };
                                console.log(subItem);
                                sleeperPromise(sleep_timeout * (i + j)).then(() => data.getDataSet("project.task").create(subItem, {context: {tracking_disable: false}}));
                            }
                        })
                    }

                }
            });
    });
});