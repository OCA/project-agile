.. image:: https://www.gnu.org/graphics/lgplv3-147x51.png
   :target: https://www.gnu.org/licenses/lgpl-3.0.en.html
   :alt: License: LGPL-v3

===============
   Web Syncer
===============

This module provides generic interface to receive CUD model notifications on web client side.

Usage
=====

To use this module functionality you need to:

- Inherit ``web.syncer`` model at the backend side


.. code-block:: python

      class Task(models.Model):
         _name = 'project.task'
         _inherit = ['web.syncer', 'project.task']

- Instantiate web.syncer and subscribe to the notifications for your model

.. code-block:: javascript

      const Syncer = require('web.syncer').Syncer;
      var sync = new Syncer();
      sync.subscribe(odoo.session_info.db + ":" + "project.task", notification => {
          let id = notification[0][2];
          let payload = notification[1];
          switch (notification[1].method) {
              case "write": // Handle record  update
                  this.recordUpdated(id, payload.data, payload);
                  break;
              case "create": // Handle created record
                  this.recordCreated(id, payload.data, payload);
                  break;
              case "unlink": // Handle removed record
                  let task = this.records.get(id);
                  if (task) {
                      this.records.delete(id);
                      payload.data = task;
                      this.recordDeleted(id, payload);
                  }
                  break;
          }
      });

Credits
=======

Contributors
------------

* Aleksandar Gajić <aleksandar.gajic@modoolar.com>

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
