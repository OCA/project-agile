import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo10-addons-oca-project-agile",
    description="Meta package for oca-project-agile Odoo addons",
    version=version,
    install_requires=[
        'odoo10-addon-project_scrum',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
    ]
)
