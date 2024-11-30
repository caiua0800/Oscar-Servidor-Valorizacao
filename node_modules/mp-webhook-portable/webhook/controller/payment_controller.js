const path = require("path");
const package = require(path.resolve("package.json"));

module.exports.payment = async (req, res) => {
  res.status(200).json({ status: "ok" });
  const { action } = req.body;

  
  if (action === "payment.updated") {
    try {
      const { data } = req.body;
      
      const libPath = path.dirname(require.resolve('mp-webhook-portable'));
      const projectPath = libPath.replace("/node_modules/mp-webhook-portable","")

      const packageJson = path.join(projectPath, "package.json")
      const packageFile = require(packageJson)

      const functionPath = packageFile.webhook_path;
      const dirnameFunction = path.join(
        projectPath,
        functionPath
      );
      console.log(data)
      require(dirnameFunction)(data);
      
      
    } catch (error) {
      console.error(error.message);
    }
  }
};

