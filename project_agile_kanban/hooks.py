# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).


def post_init_hook(cr, registry):
    import os
    from odoo.tools import misc
    from odoo import api, SUPERUSER_ID

    env = api.Environment(cr, SUPERUSER_ID, {})

    board_pathname = os.path.join('project_agile_kanban', 'data', 'board.xml')
    with misc.file_open(board_pathname) as stream:
        importer = env['project.agile.board.importer']
        reader = env['project.agile.board.xml.reader']
        importer.run(reader, stream)
