// 기본 primitive 없이 premium 3등신 러너와 코스에 쓰는 custom mesh를 생성한다.
using System.Collections.Generic;
using UnityEngine;

namespace RunningUp.MyRunner
{
    public static class ChibiMeshFactory
    {
        public static Mesh CreateEllipsoid(
            string name,
            Vector3 radii,
            int longitudeSegments = 48,
            int latitudeSegments = 24)
        {
            longitudeSegments = Mathf.Max(8, longitudeSegments);
            latitudeSegments = Mathf.Max(6, latitudeSegments);
            var vertices = new List<Vector3>((longitudeSegments + 1) * (latitudeSegments + 1));
            var normals = new List<Vector3>(vertices.Capacity);
            var uv = new List<Vector2>(vertices.Capacity);
            var triangles = new List<int>(longitudeSegments * latitudeSegments * 6);

            for (var latitude = 0; latitude <= latitudeSegments; latitude++)
            {
                var v = latitude / (float)latitudeSegments;
                var phi = Mathf.PI * v;
                var sinPhi = Mathf.Sin(phi);
                var cosPhi = Mathf.Cos(phi);
                for (var longitude = 0; longitude <= longitudeSegments; longitude++)
                {
                    var u = longitude / (float)longitudeSegments;
                    var theta = Mathf.PI * 2f * u;
                    var unit = new Vector3(
                        sinPhi * Mathf.Cos(theta),
                        cosPhi,
                        sinPhi * Mathf.Sin(theta));
                    vertices.Add(Vector3.Scale(unit, radii));
                    normals.Add(new Vector3(
                        unit.x / Mathf.Max(0.001f, radii.x),
                        unit.y / Mathf.Max(0.001f, radii.y),
                        unit.z / Mathf.Max(0.001f, radii.z)).normalized);
                    uv.Add(new Vector2(u, 1f - v));

                    if (latitude == latitudeSegments || longitude == longitudeSegments)
                    {
                        continue;
                    }

                    var current = latitude * (longitudeSegments + 1) + longitude;
                    var next = current + longitudeSegments + 1;
                    triangles.Add(current);
                    triangles.Add(next);
                    triangles.Add(current + 1);
                    triangles.Add(current + 1);
                    triangles.Add(next);
                    triangles.Add(next + 1);
                }
            }

            return BuildMesh(name, vertices, normals, uv, triangles);
        }

        public static Mesh CreateTaperedTube(
            string name,
            float length,
            float topRadius,
            float bottomRadius,
            int radialSegments = 32,
            int heightSegments = 12)
        {
            radialSegments = Mathf.Max(8, radialSegments);
            heightSegments = Mathf.Max(2, heightSegments);
            var vertices = new List<Vector3>((radialSegments + 1) * (heightSegments + 1) + 2);
            var normals = new List<Vector3>(vertices.Capacity);
            var uv = new List<Vector2>(vertices.Capacity);
            var triangles = new List<int>(radialSegments * heightSegments * 6 + radialSegments * 6);

            for (var heightIndex = 0; heightIndex <= heightSegments; heightIndex++)
            {
                var v = heightIndex / (float)heightSegments;
                var eased = Mathf.SmoothStep(0f, 1f, v);
                var radius = Mathf.Lerp(bottomRadius, topRadius, eased);
                var softShape = 1f + Mathf.Sin(v * Mathf.PI) * 0.065f;
                radius *= softShape;
                var y = Mathf.Lerp(-length * 0.5f, length * 0.5f, v);
                for (var radial = 0; radial <= radialSegments; radial++)
                {
                    var u = radial / (float)radialSegments;
                    var angle = u * Mathf.PI * 2f;
                    var normal = new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle));
                    vertices.Add(new Vector3(normal.x * radius, y, normal.z * radius));
                    normals.Add(normal);
                    uv.Add(new Vector2(u, v));
                    if (heightIndex == heightSegments || radial == radialSegments)
                    {
                        continue;
                    }

                    var current = heightIndex * (radialSegments + 1) + radial;
                    var next = current + radialSegments + 1;
                    triangles.Add(current);
                    triangles.Add(current + 1);
                    triangles.Add(next);
                    triangles.Add(current + 1);
                    triangles.Add(next + 1);
                    triangles.Add(next);
                }
            }

            var bottomCenter = vertices.Count;
            vertices.Add(new Vector3(0f, -length * 0.5f, 0f));
            normals.Add(Vector3.down);
            uv.Add(new Vector2(0.5f, 0.5f));
            var topCenter = vertices.Count;
            vertices.Add(new Vector3(0f, length * 0.5f, 0f));
            normals.Add(Vector3.up);
            uv.Add(new Vector2(0.5f, 0.5f));
            for (var radial = 0; radial < radialSegments; radial++)
            {
                triangles.Add(bottomCenter);
                triangles.Add(radial + 1);
                triangles.Add(radial);
                var topStart = heightSegments * (radialSegments + 1);
                triangles.Add(topCenter);
                triangles.Add(topStart + radial);
                triangles.Add(topStart + radial + 1);
            }

            return BuildMesh(name, vertices, normals, uv, triangles);
        }

        public static Mesh CreateBox(string name, Vector3 size)
        {
            var half = size * 0.5f;
            var vertices = new[]
            {
                new Vector3(-half.x, -half.y, -half.z), new Vector3(half.x, -half.y, -half.z),
                new Vector3(half.x, half.y, -half.z), new Vector3(-half.x, half.y, -half.z),
                new Vector3(-half.x, -half.y, half.z), new Vector3(half.x, -half.y, half.z),
                new Vector3(half.x, half.y, half.z), new Vector3(-half.x, half.y, half.z),
            };
            var triangles = new[]
            {
                0, 2, 1, 0, 3, 2,
                1, 2, 6, 1, 6, 5,
                5, 6, 7, 5, 7, 4,
                4, 7, 3, 4, 3, 0,
                3, 7, 6, 3, 6, 2,
                4, 0, 1, 4, 1, 5,
            };
            var mesh = new Mesh { name = name, vertices = vertices, triangles = triangles };
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh CreateTorus(
            string name,
            float majorRadius,
            float minorRadius,
            int majorSegments = 48,
            int minorSegments = 16)
        {
            majorSegments = Mathf.Max(8, majorSegments);
            minorSegments = Mathf.Max(6, minorSegments);
            var vertices = new List<Vector3>((majorSegments + 1) * (minorSegments + 1));
            var normals = new List<Vector3>(vertices.Capacity);
            var uv = new List<Vector2>(vertices.Capacity);
            var triangles = new List<int>(majorSegments * minorSegments * 6);

            for (var major = 0; major <= majorSegments; major++)
            {
                var u = major / (float)majorSegments;
                var majorAngle = u * Mathf.PI * 2f;
                var radial = new Vector3(Mathf.Cos(majorAngle), 0f, Mathf.Sin(majorAngle));
                var center = radial * majorRadius;
                for (var minor = 0; minor <= minorSegments; minor++)
                {
                    var v = minor / (float)minorSegments;
                    var minorAngle = v * Mathf.PI * 2f;
                    var normal = radial * Mathf.Cos(minorAngle) + Vector3.up * Mathf.Sin(minorAngle);
                    vertices.Add(center + normal * minorRadius);
                    normals.Add(normal.normalized);
                    uv.Add(new Vector2(u, v));
                    if (major == majorSegments || minor == minorSegments)
                    {
                        continue;
                    }

                    var current = major * (minorSegments + 1) + minor;
                    var next = current + minorSegments + 1;
                    triangles.Add(current);
                    triangles.Add(next);
                    triangles.Add(current + 1);
                    triangles.Add(current + 1);
                    triangles.Add(next);
                    triangles.Add(next + 1);
                }
            }

            return BuildMesh(name, vertices, normals, uv, triangles);
        }

        public static Mesh CreateCurvedRoad(
            string name,
            float length,
            float width,
            int segments,
            float curveAmplitude,
            float curveFrequency)
        {
            segments = Mathf.Max(8, segments);
            var vertices = new Vector3[(segments + 1) * 2];
            var uv = new Vector2[vertices.Length];
            var triangles = new int[segments * 6];

            for (var index = 0; index <= segments; index++)
            {
                var t = index / (float)segments;
                var z = Mathf.Lerp(-length * 0.25f, length * 0.75f, t);
                var centerX = Mathf.Sin(z * curveFrequency) * curveAmplitude;
                var tangentX = Mathf.Cos(z * curveFrequency) * curveAmplitude * curveFrequency;
                var right = new Vector3(1f, 0f, -tangentX).normalized;
                var center = new Vector3(centerX, 0f, z);
                vertices[index * 2] = center - right * width * 0.5f;
                vertices[index * 2 + 1] = center + right * width * 0.5f;
                uv[index * 2] = new Vector2(0f, t * 12f);
                uv[index * 2 + 1] = new Vector2(1f, t * 12f);

                if (index == segments)
                {
                    continue;
                }

                var triangle = index * 6;
                var vertex = index * 2;
                triangles[triangle] = vertex;
                triangles[triangle + 1] = vertex + 2;
                triangles[triangle + 2] = vertex + 1;
                triangles[triangle + 3] = vertex + 1;
                triangles[triangle + 4] = vertex + 2;
                triangles[triangle + 5] = vertex + 3;
            }

            var mesh = new Mesh { name = name, vertices = vertices, triangles = triangles, uv = uv };
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        private static Mesh BuildMesh(
            string name,
            List<Vector3> vertices,
            List<Vector3> normals,
            List<Vector2> uv,
            List<int> triangles)
        {
            var mesh = new Mesh { name = name };
            if (vertices.Count > 65535)
            {
                mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
            }

            mesh.SetVertices(vertices);
            mesh.SetNormals(normals);
            mesh.SetUVs(0, uv);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
