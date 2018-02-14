.. image:: https://www.gnu.org/graphics/lgplv3-147x51.png
   :target: https://www.gnu.org/licenses/lgpl-3.0.en.html
   :alt: License: LGPL-v3

=================
Web Actions Multi
=================

This module provides a way to trigger more than one action on ActionManager

Usage
=====

To use this functionality you need to return following action filled with list of actions to execute:

.. code-block:: python

      @api.multi
      def foo()
         self.ensure_one()
         return {
            'type': 'ir.actions.act_multi',
            'actions': [
                {'type': 'ir.actions.act_window_close'},
                {'type': 'ir.actions.act_view_reload'},
            ]
         }

Credits
=======

Contributors
------------

* Petar Najman <petar.najman@modoolar.com>
* Mladen Meseldzija <mladen.meseldzija@modoolar.com>

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
