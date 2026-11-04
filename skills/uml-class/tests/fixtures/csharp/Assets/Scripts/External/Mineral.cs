using UnityEngine;

namespace Colonization.Unit.External
{
    public class Mineral : ScriptableObject
    {
        [SerializeField] private int _value;

        public int Value => _value;
    }
}
