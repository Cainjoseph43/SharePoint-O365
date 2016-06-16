#ExtendedSPSecurityTrimmedControl
Extends the SPSecurityTrimmedControl to allow security trimming based on group membership.

**Doesn't work properly. Do not use without fixing/testing properly.**

```
namespace MyProject.Controls
{
    using System;
    using System.Collections.Generic;
    using System.Web.UI;

    using Microsoft.SharePoint;
    using Microsoft.SharePoint.WebControls;

    /// <summary>
    /// The extended security trimmed control extends the functionality of the <see cref="SPSecurityTrimmedControl"/> to also enable security trimming by group names or associated groups.
    /// </summary>
    public class ExtendedSecurityTrimmedControl : SPSecurityTrimmedControl
    {
        private List<string> groups = new List<string>();

        /// <summary>
        /// Gets or sets the groups string.
        /// </summary>
        /// <value>
        /// The groups string.
        /// </value>
        public string GroupsString
        {
            get
            {
                return string.Join(",", this.groups.ToArray());
            }

            set
            {
                this.groups.AddRange(value.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries));
            }
        }

        /// <summary>
        /// Gets or sets a value indicating whether control content is shown for associated owners.
        /// </summary>
        /// <value>
        /// The show for associated owners.
        /// </value>
        public bool ShowForAssociatedOwners { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether control content is shown for associated members.
        /// </summary>
        /// <value>
        /// The show for associated members.
        /// </value>
        public bool ShowForAssociatedMembers { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether control content is shown for associated visitors.
        /// </summary>
        /// <value>
        /// The show for associated visitors.
        /// </value>
        public bool ShowForAssociatedVisitors { get; set; }

        /// <summary>
        /// Overrides the Render method of the base <see cref="SPSecurityTrimmedControl"/>.
        /// </summary>
        /// <param name="output">
        /// The output.
        /// </param>
        protected override void Render(HtmlTextWriter output)
        {
            var web = SPContext.Current.Web;

            if (this.ShowForAssociatedOwners && web.AssociatedOwnerGroup != null && web.AssociatedOwnerGroup.ContainsCurrentUser)
            {
                base.Render(output);
                return;
            }

            if (this.ShowForAssociatedMembers && web.AssociatedMemberGroup != null && web.AssociatedMemberGroup.ContainsCurrentUser)
            {
                base.Render(output);
                return;
            }

            if (this.ShowForAssociatedVisitors && web.AssociatedVisitorGroup != null && web.AssociatedVisitorGroup.ContainsCurrentUser)
            {
                base.Render(output);
                return;
            }

            if (!string.IsNullOrEmpty(this.GroupsString) && this.IsMember(web, this.groups))
            {
                base.Render(output);
                return;
            }

            if (!string.IsNullOrEmpty(this.PermissionsString))
            {
                base.Render(output);
            }
        }

        /// <summary>
        /// Checks if the current user is a member of the groups added to the GroupString.
        /// </summary>
        /// <param name="web">
        /// The current web site.
        /// </param>
        /// <param name="groupNames">
        /// The list of group names to check.
        /// </param>
        /// <returns>
        /// True if the current user is a member, otherwise False.
        /// </returns>
        private bool IsMember(SPWeb web, IEnumerable<string> groupNames) 
        {
            foreach (var groupName in groupNames)
            {
                if (this.GroupExists(web.Groups, groupName))
                {
                    var group = web.Groups.GetByName(groupName);

                    if (group.ContainsCurrentUser)
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        /// <summary>
        /// Checks if the group exists.
        /// </summary>
        /// <param name="groupCollection">
        /// The group collection to check.
        /// </param>
        /// <param name="name">
        /// The name of the group.
        /// </param>
        /// <returns>
        /// True if a group with the given name exists, otherwise False.
        /// </returns>
        private bool GroupExists(SPGroupCollection groupCollection, string name)
        {
            try
            {
                groupCollection.GetByName(name);
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
    }
}
```