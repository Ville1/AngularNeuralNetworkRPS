using Microsoft.Extensions.Configuration;

namespace AngularNeuralNetworkFront.Utils
{
    public class Settings
    {
        public static void Initialize(IConfiguration configuration)
        {
            RestUrl = configuration.GetValue<string>("RestUrl");
        }

        public static string RestUrl { get; private set; }
    }
}
