<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a name="readme-top"></a>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
<!--[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]
-->


<!-- PROJECT LOGO -->
<br />
<div align="center">
  <!--<a href="https://github.com/leridon/rs3scantrainer">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>-->

<h3 align="center">Clue Trainer</h3>

  <p align="center">
    An interactive guide and assistant for clue scrolls in RuneScape 3.
   <!-- <br />
    <a href="https://github.com/leridon/rs3scantrainer"><strong>Explore the docs »</strong></a>
    <br />-->
    <br />
    <a href="https://leridon.github.io/rs3scantrainer/">Web Version and Installation</a>
    ·
    <a href="#support-and-feedback">Report Bug</a>
    ·
    <a href="#support-and-feedback">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#support-and-feedback">Support</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://example.com)

Clue Trainer is a new clue solver for RuneScape 3 using the Alt1 Toolkit. 
Some Highlights:
- A more relaxed puzzle solver updating the move overlay in real time according to your actual solving speed and producing solutions with fewer steps.
- Real time overlay updating for celtic knots, lockboxes and tower puzzles as well.
- Movement instructions shown on the map, so you can learn the most efficient paths along the way.
- Advanced strategies for scan clues displayed in an interactive, easy to memorize fashion.
- A compass solver more accurate than ever with the ability to select preset triangulation strategies.
- A path and method editor so you can create, save, and share your own ways of solving clues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- GETTING STARTED -->
## Getting Started

### Installation

1. Make sure you have the Alt1 toolkit installed. Alt1 can only be downloaded legitimately from [runeapps.org](https://runeapps.org/).
2. Visit the [Web Version](https://leridon.github.io/rs3scantrainer/) to access some of Clue Trainer's features or install it using the links provided there.
3. Alternatively, open `alt1://addapp/https://leridon.github.io/rs3scantrainer/appconfig.json` in your browser or visit `https://leridon.github.io/rs3scantrainer/` in Alt1's included browser.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Development

This section is about getting started with developing Clue Trainer. See [here](#getting-started) for instructions for getting started with using Clue Trainer.

Clue Trainer is a static website built using npm and TypeScript. 

1. Install dependencies using npm.
   ```sh
   npm install
   ```
2. Build the project into the `dist` folder
   ```sh
   npm run build
   ```
3. Serve the static content using a local webserver so it can be accessed in a browser or installed in Alt1. This is also available as a convenience in the script file `serve_for_alt1.sh`.
   ````sh
   cd dist
   python3 -m http.server 8000 --bind 127.0.0.1
   ````
4. Visit `127.0.0.1` in your browser to use your local version and install it in your local Alt1 

Please do not enable any crowdsourcing options while using your local development version.

<!-- USAGE EXAMPLES -->


<!-- ROADMAP -->

## Roadmap

Clue Trainer is in active development and will continue to receive additional features and improvements to existing features, including but not limited to:

- [ ] A full set of recommended paths for all clue tiers.
- [ ] Display answers to challenge scrolls directly in the dialogue box.
- [ ] Improvements to the UI and general workflow for compass clues.
- [ ] Improvements to the workflow of solving scan clues, including reading the current pulse color directly from the screen.
- [ ] Recommendations for using charges of globetrotter backpack and jacket charges.

Learn how to suggest features [here](#support-and-feedback).

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions to Clue Trainer in the form of either code or content are highly welcome. Check out [Getting Started](#getting-started) to see how to set up the project locally, so you can start coding.
If you are serious about contributing a feature to Clue Trainer, please get into touch as described [here](#support-and-feedback) to discuss the details before spending a large amount of effort.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


## Support and Feedback

You can get support, report issues, request features, or leave praise or criticism by  by joining the [Clue Chasers Discord](https://discord.gg/cluechasers) and entering the [#clue-trainer](https://discord.com/channels/332595657363685377/1103737270114209825) channel.
For support, issues and feature requests you can also create an [issue][issues-url].

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Contents of this project are partially distributed under the MIT License. See [LICENSE.md](license.md) to see details and which files this applies to.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Zyklop Marco - [@zyklopmarco](https://twitter.com/zyklopmarco)

Project Link: [https://github.com/leridon/rs3scantrainer](https://github.com/leridon/rs3scantrainer)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

I owe thanks to the following persons for making Clue Trainer possible.

* [Skillbert](https://runeapps.org/) for creating Alt1 in the first place and especially for allowing me to use code and data from the official clue solver, as well as for providing high quality map data for the world map.
* Contributors from the Clue Chasers discord for providing knowledge about clues, and specifically Ngis for contributing content to Clue Trainer.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/leridon/rs3scantrainer.svg?style=for-the-badge
[contributors-url]: https://github.com/leridon/rs3scantrainer/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/leridon/rs3scantrainer.svg?style=for-the-badge
[forks-url]: https://github.com/leridon/rs3scantrainer/network/members
[stars-shield]: https://img.shields.io/github/stars/leridon/rs3scantrainer.svg?style=for-the-badge
[stars-url]: https://github.com/leridon/rs3scantrainer/stargazers
[issues-shield]: https://img.shields.io/github/issues/leridon/rs3scantrainer.svg?style=for-the-badge
[issues-url]: https://github.com/leridon/rs3scantrainer/issues
[license-shield]: https://img.shields.io/github/license/leridon/rs3scantrainer.svg?style=for-the-badge
[license-url]: https://github.com/leridon/rs3scantrainer/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: .github/readmeassets/intro_screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[Angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.io/
[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Laravel.com]: https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white
[Laravel-url]: https://laravel.com
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[JQuery.com]: https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white
[JQuery-url]: https://jquery.com 