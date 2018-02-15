# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models


def name(value):
    return {'name': value}


class XmlWorkflowReader(models.AbstractModel):
    _inherit = 'project.workflow.xml.reader'

    def read_transition(self, element):
        data = super(XmlWorkflowReader, self).read_transition(element)

        data['task_types'] = self.read_transition_task_types(element)

        return data

    def read_transition_task_types(self, element):
        """
        Reads workflow security groups data out of the given xml element.
        :param element: The xml element which holds information
        about project workflow transitions.
        :return: Returns the workflow transitions.
        """
        groups = []
        for e in element.iterfind('task-types/task-type'):
            groups.append(self.read_transition_task_type(e))
        return groups

    def read_transition_task_type(self, element):
        return {
            'name': self.read_string(element, 'name'),
        }

    def extend_rng(self, rng_etree):
        rng_etree = super(XmlWorkflowReader, self).extend_rng(rng_etree)
        root = rng_etree.getroot()

        root.insert(0, self.rng_define_task_types())

        transition = root.xpath(
            "//rng:define[@name='transition']"
            "//rng:element[@name='transition']",
            namespaces=self._rng_namespace_map
        )[0]

        transition.append(self.rng_task_type_element())
        return rng_etree

    def rng_define_task_types(self):
        E = self.get_element_maker()

        doc = E.grammar(
            E.define(
                name('task-type'),
                E.element(
                    name('task-type'),
                    E.attribute(
                        name('name'),
                        E.text()
                    )
                )
            )
        )
        return doc[0]

    def rng_task_type_element(self):
        E = self.get_element_maker()
        doc = E.grammar(
            E.optional(
                E.element(
                    name('task-types'),
                    E.optional(
                        E.oneOrMore(
                            E.ref(
                                name("task-type")
                            )
                        )
                    )
                )
            )
        )
        return doc[0]
