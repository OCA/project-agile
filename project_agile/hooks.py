# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


def post_init_hook(cr, registry):
    import os
    from odoo import api, SUPERUSER_ID
    from odoo.tools import misc

    env = api.Environment(cr, SUPERUSER_ID, {})

    # Load project workflow
    workflow_pathname = os.path.join('project_agile', 'data', 'project_workflow.xml')
    with misc.file_open(workflow_pathname) as stream:
        importer = env['project.workflow.importer']
        reader = env['project.workflow.xml.reader']
        workflow = importer.run(reader, stream)
        workflow.write({'state': 'live'})  # Publish imported workflow

        # Assign simple workflow to all project types
        env['project.type'].search([]).write({'workflow_id': workflow.id})

    # We need to assign initial agile order. It would be nicer if latest tasks were in the top of the backlog.
    cr.execute("SELECT COUNT(*) FROM project_task")
    count = cr.fetchone()[0]
    cr.execute('UPDATE project_task SET agile_order = %s - id WHERE agile_order IS NULL' % (int(count)))

    # Set default project task type to the existing projects
    env['project.project'].sudo().with_context(no_workflow=True)._set_default_project_type_id()

    # and set ``type_id`` field to not null
    cr.execute("ALTER TABLE project_project ALTER COLUMN type_id SET NOT NULL;")

    # Set default project task type to the existing tasks
    env['project.task'].sudo()._set_default_task_type_id()

    # and set ``type_id`` field to not null
    cr.execute("ALTER TABLE project_task ALTER COLUMN type_id SET NOT NULL;")

    # Set default task priority to the existing tasks
    env['project.task'].sudo()._set_default_task_priority_id()

    # and set ``priority_id`` field to not null
    cr.execute("ALTER TABLE project_task ALTER COLUMN priority_id SET NOT NULL;")
