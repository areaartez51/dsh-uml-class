using System;
using System.Collections.Generic;

namespace Colonization.Edge
{
    public enum UnitState
    {
        Idle,
        Moving,
        Mining
    }

    public struct GridPoint
    {
        public int X;
        public int Y;
    }

    public record UnitSnapshot(string Name, int Price);

    [Serializable]
    public partial class Warehouse
    {
        private readonly Dictionary<string, List<int>> _slots = new Dictionary<string, List<int>>();
        private const int Capacity = 10;
        private static int _instances;

        public string Title { get; private set; }
        public int Count { get; init; }

        public T Find<T>(string key) where T : class
        {
            return null;
        }
    }

    public partial class Warehouse
    {
        private string _note = @"многострочная
строка с ""кавычками""";

        private string _interpolated = $"склад {Capacity}";

        public void Reset()
        {
#if UNITY_EDITOR
            _instances = 0;
#endif
        }

        public class Slot
        {
            public int Index;
        }
    }
}
