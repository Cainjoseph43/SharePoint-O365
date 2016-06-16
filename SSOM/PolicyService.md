#PolicyService
A service to manage policies in SharePoint, such as site policies.

```
namespace MyNamespace
{
    using System;
    using System.Linq;
    using System.Xml;

    using Microsoft.Office.RecordsManagement.InformationPolicy;
    using Microsoft.SharePoint;
    using Microsoft.SharePoint.Administration;

    /// <summary>
    /// The policy service manages policies like Site Retention Policies.
    /// </summary>
    public class PolicyService
    {
        /// <summary>
        /// Ensures that a site policy with the given name and schema exists on the given site collection.
        /// </summary>
        /// <param name="site">
        /// The site where the policy should be ensured.
        /// </param>
        /// <param name="policyName">
        /// The policy name.
        /// </param>
        /// <param name="policyDescription">
        /// The policy description.
        /// </param>
        /// <param name="policySchema">
        /// The policy settings schema.
        /// </param>
        public static void EnsureSitePolicy(SPSite site, string policyName, string policyDescription, XmlDocument policySchema)
        {
            if (PolicyExists(site.RootWeb, policyName))
            {
                var policyContentType = site.RootWeb.ContentTypes[policyName];
                UpdatePolicySchema(policyContentType, policySchema);
                return;
            }

            CreateSitePolicy(site, policyName, policyDescription, policySchema);
        }

        /// <summary>
        /// Creates site policy.
        /// </summary>
        /// <param name="site">
        /// The site where the policy should be created.
        /// </param>
        /// <param name="policyName">
        /// The policy name.
        /// </param>
        /// <param name="policyDescription">
        /// The policy description.
        /// </param>
        /// <param name="policySchema">
        /// The policy settings schema.
        /// </param>
        public static void CreateSitePolicy(SPSite site, string policyName, string policyDescription, XmlDocument policySchema)
        {
            // The ProjectPolicy is the parent content type for site policies.
            var projectPolicyContentTypeId = new SPContentTypeId("0x010085EC78BE64F9478aAE3ED069093B9963");
            var contentTypes = site.RootWeb.ContentTypes;
            var parentContentType = contentTypes[projectPolicyContentTypeId];

            if (PolicyExists(site.RootWeb, policyName))
            {
                // Log here.
                return;
            }

            var policyContentType = new SPContentType(parentContentType, contentTypes, policyName);

            policyContentType = contentTypes.Add(policyContentType);
            policyContentType.Group = parentContentType.Group;
            policyContentType.Description = policyDescription;
            policyContentType.Hidden = true;
            policyContentType.Update();

            UpdatePolicySchema(policyContentType, policySchema);

            // Final step is to create new Policy with new content type.
            Policy.CreatePolicy(policyContentType, null);
        }

        /// <summary>
        /// Applies a site policy with the given name on the given site.
        /// </summary>
        /// <param name="web">
        /// The site where the policy should be applied.
        /// </param>
        /// <param name="policyName">
        /// The name of the policy to apply.
        /// </param>
        public static void ApplySitePolicy(SPWeb web, string policyName)
        {
            var policy = (from projectPolicy in ProjectPolicy.GetProjectPolicies(web)
                          where projectPolicy.Name.Equals(policyName)
                          select projectPolicy).Single();
            
            ProjectPolicy.ApplyProjectPolicy(web, policy);
        }

        /// <summary>
        /// Sets up the site policy warning email.
        /// </summary>
        /// <param name="policy">
        /// The policy.
        /// </param>
        /// <param name="emailSubject">
        /// The email subject.
        /// </param>
        /// <param name="emailBody">
        /// The email body.
        /// </param>
        public static void SetupSitePolicyEmail(ProjectPolicy policy, string emailSubject, string emailBody)
        {
            policy.EmailSubject = emailSubject;
            policy.EmailBody = emailBody;
            policy.EmailBodyWithTeamMailbox = emailBody;
            policy.SavePolicy();
        }

        /// <summary>
        /// Gets the site policy schema.
        /// </summary>
        /// <param name="webApplication">
        /// The web application.
        /// </param>
        /// <returns>
        /// The <see cref="XmlDocument"/> site policy schema.
        /// </returns>
        public static XmlDocument GetSitePolicySchema(SPWebApplication webApplication)
        {
            var sitePolicySchema = webApplication.Properties["Site Policy Schema"].ToString();

            if (string.IsNullOrEmpty(sitePolicySchema))
            {
                throw new Exception("Can't find site policy schema.");
            }

            var xmlSchema = new XmlDocument();
            xmlSchema.LoadXml(sitePolicySchema);
            return xmlSchema;
        }

        /// <summary>
        /// The update policy schema.
        /// </summary>
        /// <param name="policyContentType">
        /// The policy content type.
        /// </param>
        /// <param name="policySchema">
        /// The policy settings schema.
        /// </param>
        private static void UpdatePolicySchema(SPContentType policyContentType, XmlDocument policySchema)
        {
            policyContentType.XmlDocuments.Delete("http://schemas.microsoft.com/office/server/projectpolicy");
            policyContentType.XmlDocuments.Add(policySchema);
            policyContentType.Update();
        }

        /// <summary>
        /// Checks if a policy with the given name exists on a web site.
        /// </summary>
        /// <param name="web">
        /// The web site.
        /// </param>
        /// <param name="policyName">
        /// The policy name.
        /// </param>
        /// <returns>
        /// True if the policy exists. Otherwise False.
        /// </returns>
        private static bool PolicyExists(SPWeb web, string policyName)
        {
            var policyResults = from projectPolicy in ProjectPolicy.GetProjectPolicies(web)
                                where projectPolicy.Name.Equals(policyName)
                                select projectPolicy;

            return policyResults.Any();
        }
    }
}
```