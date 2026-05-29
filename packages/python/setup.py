"""
Setup script for AgentStack-SDK Python package
"""

from setuptools import setup, find_packages
import os

# Read README file
def read_readme():
    readme_path = os.path.join(os.path.dirname(__file__), 'README.md')
    if os.path.exists(readme_path):
        with open(readme_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "AgentStack-SDK for Python - Modular architecture for AgentStack API"

# Read requirements
def read_requirements():
    requirements_path = os.path.join(os.path.dirname(__file__), 'requirements.txt')
    if os.path.exists(requirements_path):
        with open(requirements_path, 'r', encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip() and not line.startswith('#')]
    return [
        'aiohttp>=3.8.0',
        'asyncio-mqtt>=0.11.0',
        'python-dateutil>=2.8.0',
        'typing-extensions>=4.0.0'
    ]

setup(
    name="agentstack-sdk",
    version="1.0.0",
    description="AgentStack-SDK for Python - Modular architecture for AgentStack API",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="AgentStack Team",
    author_email="dev@agentstack.tech",
    url="https://github.com/agentstacktech/agentstack-sdk",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Office/Business :: Financial",
    ],
    python_requires=">=3.8",
    install_requires=read_requirements(),
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.0.0",
            "black>=22.0.0",
            "isort>=5.10.0",
            "flake8>=5.0.0",
            "mypy>=1.0.0",
        ],
        "docs": [
            "sphinx>=5.0.0",
            "sphinx-rtd-theme>=1.0.0",
            "myst-parser>=0.18.0",
        ],
    },
    keywords=[
        "agentstack",
        "agentstack-sdk",
        "sdk",
        "api",
        "client",
        "payments",
        "analytics",
        "neural",
        "admin",
        "modular",
        "python",
        "async",
        "aiohttp"
    ],
    project_urls={
        "Homepage": "https://agentstack.tech",
        "Documentation": "https://agentstack.tech/swagger",
        "Repository": "https://github.com/agentstacktech/agentstack-sdk.git",
        "Bug Reports": "https://github.com/agentstacktech/agentstack-sdk/issues",
        "Source": "https://github.com/agentstacktech/agentstack-sdk",
    },
    entry_points={
        "console_scripts": [
            "agentstack=agentstack_sdk.cli:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
)
