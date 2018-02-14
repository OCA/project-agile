.. image:: https://www.gnu.org/graphics/lgplv3-147x51.png
   :target: https://www.gnu.org/licenses/lgpl-3.0.en.html
   :alt: License: LGPL-v3

===========
Project Key
===========

This module provides functionality to uniquely identify projects and tasks by simple ``key`` field.


Usage
=====

To use this module functionality you just need to:

On ``project.project`` level:

In Kanban View:

#. Go to Project > Dashboard
#. Create
#. Enter project name and use auto generated key or simply override value by entering your own key value.

In Tree View:

#. Go to Project > Configuration > Projects
#. Create
#. Enter project name and use auto generated key or simply override value by entering your own key value.

In form View:

#. Go to Project > Dashboard
#. Open the projects settings
#. Modify the "key" value
#. After modifying project key any existing task will be reindexed automatically.

On ``project.task`` level:

#. Actually there is nothing to be done here
#. Task keys are auto generated based on project key value with per project auto incremented number (i.e. PA-1, PA-2, etc)

In browser address bar:

#. Navigate to your project by entering following url: http://<<your-domain>>/browse/PROJECT-KEY
#. Navigate to your task by entering following url: http://<<your-domain>>/browse/TASK-KEY

Credits
=======

Contributors
------------

* Petar Najman <petar.najman@modoolar.com>
* Sladjan Kantar <sladjan.kantar@modoolar.com>
* Miroslav Nikolić <miroslav.nikolic@modoolar.com>

Maintainer
----------

.. image:: https://modoolar.com/modoolar-static/modoolar-logo.png
   :alt: Modoolar
   :target: https://modoolar.com

This module is maintained by Modoolar.

::

   As Odoo Silver partner, our company is specialized in Odoo ERP customization and business solutions development.
   Beside that, we build cool apps on top of Odoo platform.

To contribute to this module, please visit https://modoolar.com
