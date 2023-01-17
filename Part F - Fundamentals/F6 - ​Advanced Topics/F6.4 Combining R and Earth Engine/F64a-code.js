// //  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// //  Chapter:      F6.4 Combining R and Earth Engine
// //  Checkpoint:   F64a
// //  Authors:      Cesar Aybar, David Montero, Antony Barja, Fernando Herrera, Andrea Gonzales, and Wendy Espinoza
// //  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   
// Comment from Ellen:
// If possible, perhaps put this into a checkpoint? Also, one option (if links are allowed in that), to refer to the link: https://r-spatial.github.io/rgee/reference/ee_install_set_pyenv.html
// Installation is always tricky.
// Till today I am still having issue with the Anaconda install in Windows :).

// Installing rgee can be challenging, since it has dependencies in both R and Python. Thanks to the fantastic work of CRAN managing R packages, installation in R should not be a problem. Nevertheless, some difficulties can appear when users try to connect both languages. If you are a new Python user, we recommend using the built-in ee_install function. In Rstudio, press Ctrl + Enter (or just Enter on macOS) to execute the code line by line.

// library(rgee)
// rgee::ee_install()

 
// The ee_install function will set up everything for you. In short, it performs the following tasks: (1) Creating a Python environment, (2) creating an environment variable, EARTHENGINE_PYTHON, that stores your Python interpreter path (which will help rgee know where to look the next time you log in), and (3) installing the dependencies in the previously created environment. Alternatively, users who want to use their own Python environment could run, instead of ee_install, one of the following options, depending on their operating system.

// # IMPORTANT: Change 'py_path' argument according to your own Python PATH
// ## For Anaconda users - Windows OS
// ## Anaconda users must run "where anaconda" in the console.
// win_py_path = paste0(
//     "C:/Users/UNICORN/AppData/Local/Programs/Python/",
//     "Python37/python.exe"
// )
// ee_install_set_pyenv(
//   py_path = win_py_path,
//   py_env = NULL # Change it for your own Python ENV
// )

// ## For Anaconda users - MacOS users
// ## Anaconda users must run "where anaconda" in the console.
// ee_install_set_pyenv(
//   py_path = "/Users/UNICORN/opt/anaconda3/bin/python",
//   py_env = NULL # Change it for your own Python ENV
// )

// ## For Miniconda users - Windows OS
// win_py_path = paste0(
//     "C:/Users/UNICORN/AppData/Local/r-miniconda/envs/rgee/",
//     "python.exe"
// )
// ee_install_set_pyenv(
//   py_path = win_py_path,
//   py_env = "rgee" # Change it for your own Python ENV
// )

// ## For Miniconda users - Linux/MacOS users
// unix_py_path = paste0(
//     "/home/UNICORN/.local/share/r-miniconda/envs/",
//     "rgee/bin/python3"
// )
// ee_install_set_pyenv(
//   py_path = unix_py_path,
//   py_env = "rgee" # Change it for your own Python ENV
// )

// ## For virtualenv users - Linux/MacOS users
// ee_install_set_pyenv(
//   py_path = "/home/UNICORN/.virtualenvs/rgee/bin/python",
//   py_env = "rgee" # Change it for your own Python ENV
// )

// ## For Python root user - Linux/MacOS users
// ee_install_set_pyenv(
//   py_path = "/usr/bin/python3",
//   py_env = NULL, 
//   Renviron = "global" # Save ENV variables in the global .Renv file
// )

// ee_install_set_pyenv(
//   py_path = "/usr/bin/python3",
//   py_env = NULL, 
//   Renviron = "local" # Save ENV variables in a local .Renv file
// )


// Regardless of whether you are using ee_install or ee_install_set_pyenv, this only needs to be run once. Also, take into account that the Python PATH you set must have installed the rgee Python dependencies. The use of Miniconda/Anaconda is mandatory for Windows users; Linux and MacOS users could instead use virtualenv. After setting up your Python environment, you can use the function below to check the status of rgee. If you find any issue in the installation procedure, consider opening an issue at https://github.com/r-spatial/rgee/issues/.

// ee_check() # Check non-R dependencies




// Enter the link below into your browser to see how your code should look at this point

// https://github.com/giswqs/earthengine-apps 


// Note from Ellen below: "Congratulations! You have successfully deployed the Earth Engine App on Heroku. "
// Does not work although I followed the instructions :). https://docs.google.com/document/d/197jvxxajqEfCHbuw_2EcxHAv83Pjka36/edit?usp=sharing&ouid=101065852418423274055&rtpof=true&sd=true
// Author will have to test. I can test it if desired. Others are also welcome to test this.
// Was tested and closed by author in beginning of March. Feel bad that is happening right now. 
// @jeffcardille@gmail.com
// Show less
// Hi, I am also tagging  Quisheng @qwu18@utk.edu here.  Perhaps this got missed due to the editing comments. Hi Qiusheng, I ran into an issue here. Can you please check once more please? Thanks.

 
// //  -----------------------------------------------------------------------
// //  CHECKPOINT 
// //  -----------------------------------------------------------------------


