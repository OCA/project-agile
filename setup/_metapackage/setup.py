import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo12-addons-oca-project-agile",
    description="Meta package for oca-project-agile Odoo addons",
    version=version,
    install_requires=[
        'odoo12-addon-project_scrum',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
        'Framework :: Odoo :: 12.0',
    ]
)
